import { inject, singleton } from 'tsyringe';
import GatewayService from '../services/GatewayService';
import WebSocket, { Server as WebSocketServer, Data } from 'ws';
import { UserService } from '../services/UserService';
import { verifyJWT } from '../util/auth';
import { GatewayPacket, GatewayPacketType, HelloGatewayPacket, IdentifyGatewayPacket, GatewayError, JoinDiscoveryQueuePacket, DiscoveryQueueMatchPacket } from '../util/gateway';
import { getConfig } from '../util/config';
import { DiscoveryQueue } from '../util/discovery/DiscoveryQueue';

@singleton()
export default class GatewayController {
	private readonly gatewayService: GatewayService;
	private readonly userService: UserService;
	private readonly discoveryQueue: DiscoveryQueue;
	private wss?: WebSocketServer;
	public readonly authenticatedClients: Map<WebSocket, string>;

	public constructor(@inject(GatewayService) gatewayService: GatewayService, @inject(UserService) userService: UserService, @inject(DiscoveryQueue) discoveryQueue: DiscoveryQueue) {
		this.authenticatedClients = new Map();
		this.gatewayService = gatewayService;
		this.userService = userService;
		this.discoveryQueue = discoveryQueue;
	}

	public bindTo(wss: WebSocketServer) {
		if (this.wss) throw new GatewayError('WebSocketServer is already bound!');
		this.wss = wss;
		this.wss.on('connection', ws => {
			ws.on('message', data => void this.onMessage(ws, data).catch(error => {
				if (!(error instanceof GatewayError) && getConfig().logErrors) {
					console.error(error);
				}
				ws.close();
			}));
			ws.on('close', () => {
				this.authenticatedClients.delete(ws);
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
			case GatewayPacketType.JoinDiscoveryQueue:
				return this.onJoinDiscoveryQueue(ws, packet as JoinDiscoveryQueuePacket);
			case GatewayPacketType.LeaveDiscoveryQueue:
				return this.onLeaveDiscoveryQueue(ws);
			default:
				throw new GatewayError(`Received invalid packet type ${packet.type}`);
		}
	}

	public async broadcast<T extends GatewayPacket>(message: T) {
		await this.gatewayService.send([...this.authenticatedClients.keys()], message);
	}

	public async sendMessage<T extends GatewayPacket>(to: string[], message: T) {
		const recipients = [...this.authenticatedClients.entries()].filter(([,id]) => to.includes(id)).map(entry => entry[0]);
		await this.gatewayService.send(recipients, message);
	}

	public async onAuthenticate(ws: WebSocket, packet: IdentifyGatewayPacket) {
		if (this.authenticatedClients.has(ws)) throw new GatewayError('Already authenticated!');
		const { token } = packet.data;
		const { id } = await verifyJWT(token).catch(() => Promise.reject(new GatewayError('Invalid token')));
		const user = await this.userService.findOne({ id });
		if (!user) throw new GatewayError('User not found');
		this.authenticatedClients.set(ws, user.id);
		await this.gatewayService.send([ws], {
			type: GatewayPacketType.Hello
		} as HelloGatewayPacket);
	}

	public async onJoinDiscoveryQueue(ws: WebSocket, packet: JoinDiscoveryQueuePacket) {
		const userId = this.authenticatedClients.get(ws);
		if (!userId) throw new GatewayError('Not authenticated');
		const matchData = await this.discoveryQueue.addToQueue(userId, packet.data.options);
		if (matchData) {
			const payload: DiscoveryQueueMatchPacket = {
				type: GatewayPacketType.DiscoveryQueueMatch,
				data: {
					channel: matchData.channel
				}
			};
			await this.sendMessage<DiscoveryQueueMatchPacket>(matchData.users, payload);
		}
	}

	public onLeaveDiscoveryQueue(ws: WebSocket) {
		const userId = this.authenticatedClients.get(ws);
		if (!userId) throw new GatewayError('Not authenticated');
		this.discoveryQueue.removeFromQueue(userId);
	}
}
