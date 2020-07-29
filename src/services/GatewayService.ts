import { injectable } from 'tsyringe';
import WebSocket, { Data } from 'ws';
import { GatewayPacket, GatewayError } from '../util/gateway';

@injectable()
export default class GatewayService {
	public parseIncoming(data: Data): GatewayPacket {
		if (Buffer.isBuffer(data)) {
			data = data.toString();
		} else if (Array.isArray(data)) {
			data = Buffer.concat(data).toString();
		} else if (data instanceof ArrayBuffer) {
			throw new Error('ArrayBuffer not accepted!');
		}
		try {
			return JSON.parse(data);
		} catch (error) {
			throw new GatewayError('Invalid packet');
		}
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
