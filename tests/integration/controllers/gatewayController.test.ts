import { MockWebSocketServer, MockWebSocket } from '../../util/ws';
import { createGateway } from '../../../src/';
import { GatewayPacketType, IdentifyGatewayPacket } from '../../../src/util/gateway';
import { UserService } from '../../../src/services/UserService';
import { container } from 'tsyringe';
import { mock, instance, reset, spy, when, objectContaining, verify, anything } from 'ts-mockito';
import * as auth from '../../../src/util/auth';
import GatewayController from '../../../src/controllers/GatewayController';

let spiedVerifyJWT: typeof auth;
let wss: MockWebSocketServer;
let mockedUserService: UserService;
let gatewayController: GatewayController;

beforeAll(() => {
	spiedVerifyJWT = spy(auth);
	mockedUserService = mock(UserService);
	container.clearInstances();
	container.register<UserService>(UserService, { useValue: instance(mockedUserService) });
	wss = new MockWebSocketServer();
	gatewayController = createGateway(wss);
});

afterAll(() => {
	gatewayController.teardown();
});

function createWebSocket(): Promise<MockWebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new MockWebSocket(wss);
		ws.once('open', () => resolve(ws));
		ws.once('error', reject);
	});
}

let sockets: MockWebSocket[];

beforeEach(async () => {
	reset(spiedVerifyJWT);
	spiedVerifyJWT = spy(auth);
	reset(mockedUserService);
	sockets = await Promise.all([0, 0].map(() => createWebSocket()));
	await wait();
});

afterEach(async () => {
	await Promise.all(sockets.map(ws => ws.close()));
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
			await sockets[0].send(JSON.stringify({ z: 2 }));
			await expect(sockets[0].nextMessage).rejects.toThrow();
		});

		test('Closes for unknown packet', async () => {
			await sockets[0].send(JSON.stringify({ type: -1 }));
			await expect(sockets[0].nextMessage).rejects.toThrow();
		});

		test('Closes for invalid packet', async () => {
			await sockets[0].send('garbage');
			await expect(sockets[0].nextMessage).rejects.toThrow();
		});

		test('broadcast', async () => {
			// Authenticate the first socket
			gatewayController.authenticatedClients.set(sockets[0].mirror, { id: '', lastPong: Date.now() });

			const payload = { time: Date.now() };
			const stringPayload = JSON.stringify(payload);

			await gatewayController.broadcast(payload as any);
			await wait();
			await expect(sockets[0].nextMessage).resolves.toEqual(stringPayload);
			expect(sockets[1].allMessages.length).toEqual(0);

			// Authenticate the second socket
			gatewayController.authenticatedClients.set(sockets[1].mirror, { id: '', lastPong: Date.now() });
			await gatewayController.broadcast(payload as any);
			await expect(sockets[0].nextMessage).resolves.toEqual(stringPayload);
			await expect(sockets[1].nextMessage).resolves.toEqual(stringPayload);
		});

		test('sendTo', async () => {
			// Authenticate the first socket
			gatewayController.authenticatedClients.set(sockets[0].mirror, { id: 'banana', lastPong: Date.now() });
			gatewayController.authenticatedClients.set(sockets[1].mirror, { id: 'apple', lastPong: Date.now() });

			const payload = { time: Date.now() };
			const stringPayload = JSON.stringify(payload);

			await gatewayController.sendMessage(['banana'], payload as any);
			await expect(sockets[0].nextMessage).resolves.toEqual(stringPayload);
			expect(sockets[1].allMessages.length).toEqual(0);

			await gatewayController.sendMessage(['apple'], payload as any);
			await expect(sockets[1].nextMessage).resolves.toEqual(stringPayload);
			expect(sockets[0].allMessages.length).toEqual(1);

			await gatewayController.sendMessage(['apple', 'banana'], payload as any);
			await expect(sockets[0].nextMessage).resolves.toEqual(stringPayload);
			await expect(sockets[1].nextMessage).resolves.toEqual(stringPayload);

			await gatewayController.sendMessage(['apple', 'banana', 'ghost'], payload as any);
			await expect(sockets[0].nextMessage).resolves.toEqual(stringPayload);
			await expect(sockets[1].nextMessage).resolves.toEqual(stringPayload);
		});
	});

	describe('identify', () => {
		test('Successful flow for valid authorization', async () => {
			const payload: IdentifyGatewayPacket = {
				type: GatewayPacketType.Identify,
				data: {
					token: '123'
				}
			};

			when(spiedVerifyJWT.verifyJWT('123')).thenResolve({ id: '456' });
			when(mockedUserService.findOne(objectContaining({ id: '456' }))).thenResolve({} as any);
			await sockets[0].send(JSON.stringify(payload));
			expect(JSON.parse(await sockets[0].nextMessage)).toMatchObject({ type: GatewayPacketType.Hello });
			verify(spiedVerifyJWT.verifyJWT('123')).once();
			verify(mockedUserService.findOne(objectContaining({ id: '456' }))).once();
		});

		test('Closes for invalid authorization', async () => {
			const payload: IdentifyGatewayPacket = {
				type: GatewayPacketType.Identify,
				data: {
					token: '123'
				}
			};

			when(spiedVerifyJWT.verifyJWT('123')).thenReject(new Error('Test Error'));
			await sockets[0].send(JSON.stringify(payload));
			await expect(sockets[0].nextMessage).rejects.toThrow();
			verify(spiedVerifyJWT.verifyJWT('123')).once();
			verify(mockedUserService.findOne(anything())).never();
		});

		test('Closes for unknown user', async () => {
			const payload: IdentifyGatewayPacket = {
				type: GatewayPacketType.Identify,
				data: {
					token: '123'
				}
			};

			when(spiedVerifyJWT.verifyJWT('123')).thenResolve({ id: '456' });
			when(mockedUserService.findOne(objectContaining({ id: '456' }))).thenReject(new Error('Test Error'));
			await sockets[0].send(JSON.stringify(payload));
			await expect(sockets[0].nextMessage).rejects.toThrow();
			verify(spiedVerifyJWT.verifyJWT('123')).once();
			verify(mockedUserService.findOne(objectContaining({ id: '456' }))).once();
		});
	});
});
