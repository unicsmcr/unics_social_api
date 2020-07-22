import { inject, singleton } from 'tsyringe';
import GatewayService, { GatewayPacket, GatewayPacketType, AuthenticateGatewayPacket, HelloGatewayPacket } from '../services/GatewayService';
import WebSocket, { Server as WebSocketServer, Data } from 'ws';
import { User } from '../entities/User';
import { UserService } from '../services/UserService';
import { verifyJWT } from '../util/auth';

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
		if (this.wss) throw new Error('WebSocketServer is already bound!');
		this.wss = wss;
		this.wss.on('connection', ws => {
			ws.on('message', data => void this.onMessage(ws, data).catch(error => {
				console.error(error);
				ws.close();
			}));
			ws.on('close', (code, reason) => {
				this.authenticatedClients.delete(ws);
				console.log(code, reason);
			});
		});
	}

	private onMessage(ws: WebSocket, data: Data) {
		const packet = this.gatewayService.parseIncoming(data);
		return this.onPacket(ws, packet);
	}

	private async onPacket(ws: WebSocket, packet: GatewayPacket) {
		if (packet.t === GatewayPacketType.Authenticate) {
			await this.onAuthenticate(ws, packet as AuthenticateGatewayPacket);
		}
	}

	public async onAuthenticate(ws: WebSocket, packet: AuthenticateGatewayPacket) {
		let user = this.authenticatedClients.get(ws);
		if (user) throw new Error('Already authenticated!');
		const { token } = packet.d;
		const { id } = await verifyJWT(token);
		user = await this.userService.findOne({ id });
		if (!user) throw new Error('User not found');
		this.authenticatedClients.set(ws, user);
		await this.gatewayService.send([ws], {
			t: GatewayPacketType.Hello,
			d: {
				time: new Date().toISOString()
			}
		} as HelloGatewayPacket);
		return user;
	}
}
