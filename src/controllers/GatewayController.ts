import { inject, singleton } from 'tsyringe';
import GatewayService from '../services/GatewayService';
import WebSocket, { Server as WebSocketServer, Data } from 'ws';
import { UserService } from '../services/UserService';
import { verifyJWT } from '../util/auth';
import { GatewayPacket, GatewayPacketType, HelloGatewayPacket, IdentifyGatewayPacket, GatewayError } from '../util/gateway';
import { getConfig } from '../util/config';

@singleton()
export default class GatewayController {
	private readonly gatewayService: GatewayService;
	private readonly userService: UserService;
	private wss?: WebSocketServer;
	public readonly authenticatedClients: Map<WebSocket, string>;

	public constructor(@inject(GatewayService) gatewayService: GatewayService, @inject(UserService) userService: UserService) {
		this.authenticatedClients = new Map();
		this.gatewayService = gatewayService;
		this.userService = userService;
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
}
