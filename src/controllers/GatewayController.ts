import { inject, singleton } from 'tsyringe';
import GatewayService from '../services/GatewayService';
import WebSocket, { Server as WebSocketServer, Data } from 'ws';
import { User } from '../entities/User';
import { UserService } from '../services/UserService';
import { verifyJWT } from '../util/auth';
import { GatewayPacket, GatewayPacketType, HelloGatewayPacket, IdentifyGatewayPacket, GatewayError } from '../util/gateway';
import { getConfig } from '../util/config';

@singleton()
export default class GatewayController {
	private readonly gatewayService: GatewayService;
	private readonly userService: UserService;
	private wss?: WebSocketServer;
	public readonly authenticatedClients: Map<WebSocket, User>;

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
		switch (packet.t) {
			case GatewayPacketType.Identify:
				return this.onAuthenticate(ws, packet as IdentifyGatewayPacket);
			default:
				throw new GatewayError(`Received invalid packet type ${packet.t}`);
		}
	}

	public async onAuthenticate(ws: WebSocket, packet: IdentifyGatewayPacket) {
		let user = this.authenticatedClients.get(ws);
		if (user) throw new GatewayError('Already authenticated!');
		const { token } = packet.d;
		const { id } = await verifyJWT(token).catch(() => Promise.reject(new GatewayError('Invalid token')));
		user = await this.userService.findOne({ id });
		if (!user) throw new GatewayError('User not found');
		this.authenticatedClients.set(ws, user);
		await this.gatewayService.send([ws], {
			t: GatewayPacketType.Hello
		} as HelloGatewayPacket);
	}
}
