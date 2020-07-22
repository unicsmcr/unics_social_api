import { injectable } from 'tsyringe';
import WebSocket, { Data } from 'ws';
import { GatewayPacket, GatewayError } from '../util/gateway';

@injectable()
export default class GatewayService {
	public parseIncoming(data: Data): GatewayPacket {
		if (Buffer.isBuffer(data)) {
			data = data.toString();
		}
		if (typeof data !== 'string') {
			throw new GatewayError('Invalid incoming message type');
		}
		return JSON.parse(data);
	}

	private sendData(client: WebSocket, data: string): Promise<void> {
		return new Promise((resolve, reject) => {
			client.send(data, error => error ? reject(error) : resolve(error));
		});
	}

	public send(clients: WebSocket[], packet: GatewayPacket) {
		const data = JSON.stringify(packet);
		return Promise.all(clients.map(client => this.sendData(client, data)));
	}
}
