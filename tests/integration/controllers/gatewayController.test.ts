import { MockWebSocketServer, MockWebSocket } from '../../util/ws';
import { createGateway } from '../../../src/';

let wss: MockWebSocketServer;

beforeAll(() => {
	wss = new MockWebSocketServer();
	createGateway(wss);
});

function createWebSocket(): Promise<MockWebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new MockWebSocket(wss);
		ws.once('open', () => resolve(ws));
		ws.once('error', reject);
	});
}

let ws: MockWebSocket;

beforeEach(async () => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (ws) {
		ws.close();
	}
	ws = await createWebSocket();
});

function wait() {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, 1e3);
	});
}

describe('GatewayController', () => {
	test('test', async () => {
		ws.send(JSON.stringify({ t: 0 }));
		expect(ws.readyState === ws.CLOSED);
	});
});
