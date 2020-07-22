import { inject, singleton } from 'tsyringe';
import GatewayService from '../services/GatewayService';
import WebSocket, { Server as WebSocketServer, Data as WebSocketData } from 'ws';
import { User } from '../entities/User';

@singleton()
export default class GatewayController {
	private readonly gatewayService: GatewayService;
	private wss?: WebSocketServer;
	private readonly authenticatedClients: Map<WebSocket, User>;

	public constructor(@inject(GatewayService) gatewayService: GatewayService) {
		this.authenticatedClients = new Map();
		this.gatewayService = gatewayService;
	}

	public bindTo(wss: WebSocketServer) {
		if (this.wss) throw new Error('WebSocketServer is already bound!');
		this.wss = wss;
		this.wss.on('connection', ws => {
			ws.on('message', data => this.onMessage(ws, data));
			ws.on('close', (code, reason) => {
				this.authenticatedClients.delete(ws);
				console.log(code, reason);
			});
		});
	}

	private onMessage(ws: WebSocket, data: WebSocketData) {
		console.log(data);
	}
}
