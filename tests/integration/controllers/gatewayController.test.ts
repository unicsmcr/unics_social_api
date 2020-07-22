import { MockWebSocketServer, MockWebSocket } from '../../util/ws';
import { createGateway } from '../../../src/';
import { GatewayPacketType, IdentifyGatewayPacket } from '../../../src/util/gateway';
import { UserService } from '../../../src/services/UserService';
import { container } from 'tsyringe';
import { mock, instance, reset, spy, when, objectContaining, verify, anything } from 'ts-mockito';
import * as auth from '../../../src/util/auth';

let spiedVerifyJWT: typeof auth;
let wss: MockWebSocketServer;
let mockedUserService: UserService;

beforeAll(() => {
	spiedVerifyJWT = spy(auth);
	mockedUserService = mock(UserService);
	container.clearInstances();
	container.register<UserService>(UserService, { useValue: instance(mockedUserService) });
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
	reset(spiedVerifyJWT);
	spiedVerifyJWT = spy(auth);
	reset(mockedUserService);
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (ws) {
		void ws.close();
	}
	ws = await createWebSocket();
	await wait();
});

function wait() {
	return new Promise(resolve => {
		setImmediate(resolve);
	});
}

describe('GatewayController', () => {
	describe('general', () => {
		test('Closes for unknown JSON', async () => {
			await ws.send(JSON.stringify({ z: 2 }));
			await expect(ws.nextMessage).rejects.toThrow();
		});

		test('Closes for unknown packet', async () => {
			await ws.send(JSON.stringify({ t: -1 }));
			await expect(ws.nextMessage).rejects.toThrow();
		});

		test('Closes for invalid packet', async () => {
			await ws.send('garbage');
			await expect(ws.nextMessage).rejects.toThrow();
		});
	});

	describe('identify', () => {
		test('Successful flow for valid authorization', async () => {
			const payload: IdentifyGatewayPacket = {
				t: GatewayPacketType.Identify,
				d: {
					token: '123'
				}
			};

			when(spiedVerifyJWT.verifyJWT('123')).thenResolve({ id: '456' });
			when(mockedUserService.findOne(objectContaining({ id: '456' }))).thenResolve({} as any);
			await ws.send(JSON.stringify(payload));
			expect(JSON.parse(await ws.nextMessage)).toMatchObject({ t: GatewayPacketType.Hello });
			verify(spiedVerifyJWT.verifyJWT('123')).once();
			verify(mockedUserService.findOne(objectContaining({ id: '456' }))).once();
		});

		test('Closes for invalid authorization', async () => {
			const payload: IdentifyGatewayPacket = {
				t: GatewayPacketType.Identify,
				d: {
					token: '123'
				}
			};

			when(spiedVerifyJWT.verifyJWT('123')).thenReject(new Error('Test Error'));
			await ws.send(JSON.stringify(payload));
			await expect(ws.nextMessage).rejects.toThrow();
			verify(spiedVerifyJWT.verifyJWT('123')).once();
			verify(mockedUserService.findOne(anything())).never();
		});

		test('Closes for unknown user', async () => {
			const payload: IdentifyGatewayPacket = {
				t: GatewayPacketType.Identify,
				d: {
					token: '123'
				}
			};

			when(spiedVerifyJWT.verifyJWT('123')).thenResolve({ id: '456' });
			when(mockedUserService.findOne(objectContaining({ id: '456' }))).thenReject(new Error('Test Error'));
			await ws.send(JSON.stringify(payload));
			await expect(ws.nextMessage).rejects.toThrow();
			verify(spiedVerifyJWT.verifyJWT('123')).once();
			verify(mockedUserService.findOne(objectContaining({ id: '456' }))).once();
		});
	});
});
