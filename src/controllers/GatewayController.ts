import { inject, singleton } from 'tsyringe';
import GatewayService from '../services/GatewayService';
import WebSocket, { Server as WebSocketServer, Data } from 'ws';
import { UserService } from '../services/UserService';
import { verifyJWT } from '../util/auth';
import { GatewayPacket, GatewayPacketType, HelloGatewayPacket, IdentifyGatewayPacket, GatewayError, PingGatewayPacket, JoinDiscoveryQueuePacket, DiscoveryQueueMatchPacket, ClientTypingPacket, GatewayTypingPacket } from '../util/gateway';
import { getConfig } from '../util/config';
import { DiscoveryQueue, QueueMatchData } from '../util/discovery/DiscoveryQueue';
import { logger } from '../util/logger';
import ChannelService from '../services/ChannelService';
import { EventChannel, DMChannel } from '../entities/Channel';

const HEARTBEAT_INTERVAL = 20_000;
const HEARTBEAT_TOLERANCE = HEARTBEAT_INTERVAL * 3;

@singleton()
export default class GatewayController {
	private readonly gatewayService: GatewayService;
	private readonly userService: UserService;
	private readonly discoveryQueue: DiscoveryQueue;
	private wss?: WebSocketServer;
	public readonly authenticatedClients: Map<WebSocket, { id: string; lastPong: number }>;
	private readonly _heartbeatInterval: NodeJS.Timeout;
	private readonly channelService: ChannelService;

	public constructor(@inject(GatewayService) gatewayService: GatewayService, @inject(ChannelService) channelService: ChannelService, @inject(UserService) userService: UserService, @inject(DiscoveryQueue) discoveryQueue: DiscoveryQueue) {
		this.authenticatedClients = new Map();
		this.gatewayService = gatewayService;
		this.userService = userService;
		this.discoveryQueue = discoveryQueue;
		this.channelService = channelService;

		this._heartbeatInterval = setInterval(() => {
			this.checkHeartbeats()
				.catch(err => logger.error(err));
		}, HEARTBEAT_INTERVAL);
	}

	public teardown() {
		clearInterval(this._heartbeatInterval);
	}

	public async checkHeartbeats() {
		const now = Date.now();
		const payload: PingGatewayPacket = {
			type: GatewayPacketType.Ping,
			data: {
				timestamp: Date.now()
			}
		};

		/* sendMessage could fail if even one of the messages to the clients fails to send
			We do not want this to happen in heartbeating, so we send the packet individually and then
			catch errors so they do not cause the overall promise to reject */
		return Promise.all([...this.authenticatedClients.entries()].map(([ws, { lastPong }]): Promise<any> => {
			const lastAcceptablePong = lastPong + HEARTBEAT_TOLERANCE;
			return now > lastAcceptablePong ? Promise.resolve(ws.close()) : this.gatewayService.send([ws], payload).catch(() => ws.close());
		}));
	}

	public bindTo(wss: WebSocketServer) {
		if (this.wss) throw new GatewayError('WebSocketServer is already bound!');
		this.wss = wss;
		this.wss.on('connection', ws => {
			ws.on('message', data => void this.onMessage(ws, data).catch(error => {
				if (!(error instanceof GatewayError) && getConfig().logErrors) {
					logger.error(error);
				}
				ws.close();
			}));
			ws.on('close', () => {
				const userConfig = this.authenticatedClients.get(ws);
				if (userConfig) {
					this.discoveryQueue.removeFromQueue(userConfig.id);
					this.authenticatedClients.delete(ws);
				}
			});
		});
	}

	private onMessage(ws: WebSocket, data: Data) {
		try {
			const packet = this.gatewayService.parseIncoming(data);
			return this.onPacket(ws, packet);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private async onPacket(ws: WebSocket, packet: GatewayPacket) {
		switch (packet.type) {
			case GatewayPacketType.Identify:
				return this.onAuthenticate(ws, packet as IdentifyGatewayPacket);
			case GatewayPacketType.Pong:
				return this.onPong(ws);
			case GatewayPacketType.JoinDiscoveryQueue:
				return this.onJoinDiscoveryQueue(ws, packet as JoinDiscoveryQueuePacket);
			case GatewayPacketType.LeaveDiscoveryQueue:
				return this.onLeaveDiscoveryQueue(ws);
			case GatewayPacketType.ClientTyping:
				return this.onTyping(ws, packet as ClientTypingPacket);
			default:
				throw new GatewayError(`Received invalid packet type ${packet.type}`);
		}
	}

	public async broadcast<T extends GatewayPacket>(message: T) {
		await this.gatewayService.send([...this.authenticatedClients.keys()], message);
	}

	public async sendMessage<T extends GatewayPacket>(to: string[], message: T) {
		const recipients = [...this.authenticatedClients.entries()].filter(([, { id }]) => to.includes(id)).map(entry => entry[0]);
		await this.gatewayService.send(recipients, message);
	}

	public async onAuthenticate(ws: WebSocket, packet: IdentifyGatewayPacket) {
		if (this.authenticatedClients.has(ws)) throw new GatewayError('Already authenticated!');
		const { token } = packet.data;
		const { id } = await verifyJWT(token).catch(() => Promise.reject(new GatewayError('Invalid token')));
		const user = await this.userService.findOne({ id });
		if (!user) throw new GatewayError('User not found');
		this.authenticatedClients.set(ws, { id: user.id, lastPong: new Date().getTime() });
		await this.gatewayService.send([ws], {
			type: GatewayPacketType.Hello
		} as HelloGatewayPacket);
	}

	public onPong(ws: WebSocket) {
		const userConfig = this.authenticatedClients.get(ws);
		if (!userConfig) throw new GatewayError('Not authenticated');
		userConfig.lastPong = Date.now();
	}

	public async onJoinDiscoveryQueue(ws: WebSocket, packet: JoinDiscoveryQueuePacket) {
		const userConfig = this.authenticatedClients.get(ws);
		if (!userConfig) throw new GatewayError('Not authenticated');
		let matchData: QueueMatchData | undefined;
		try {
			matchData = await this.discoveryQueue.addToQueue(userConfig.id, packet.data.options);
		} catch (error) {
			throw new GatewayError(error.message);
		}
		if (matchData) {
			const channel = matchData.channel;
			await Promise.all(matchData.users.map(userID => this.sendMessage<DiscoveryQueueMatchPacket>([userID], {
				type: GatewayPacketType.DiscoveryQueueMatch,
				data: {
					channel: channel.toJSON(videoUser => videoUser.user.id === userID)
				}
			})));
		}
	}

	public onLeaveDiscoveryQueue(ws: WebSocket) {
		const userConfig = this.authenticatedClients.get(ws);
		if (!userConfig) throw new GatewayError('Not authenticated');
		this.discoveryQueue.removeFromQueue(userConfig.id);
	}

	public async onTyping(ws: WebSocket, packet: ClientTypingPacket) {
		const userConfig = this.authenticatedClients.get(ws);
		if (!userConfig) throw new GatewayError('Not authenticated');

		const { channelID } = packet.data;
		const channel = await this.channelService.findOne({ id: channelID });
		if (!channel) throw new GatewayError('Channel does not exist');

		const gatewayTypingPacket: GatewayTypingPacket = {
			type: GatewayPacketType.GatewayTyping,
			data: {
				userID: userConfig.id,
				channelID
			}
		};

		if (channel instanceof EventChannel) {
			// Send packet to everyone connected
			await this.broadcast<GatewayTypingPacket>(gatewayTypingPacket);
		} else if (channel instanceof DMChannel) {
			// Send packet to the users in the dm channel
			await this.sendMessage([...channel.users.map(user => user.id)], gatewayTypingPacket);
		}
	}
}
