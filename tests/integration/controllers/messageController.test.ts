import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import '../../util/dbTeardown';
import users from '../../fixtures/users';
import { APIError } from '../../../src/util/errors';
import * as getUserMiddleware from '../../../src/routes/middleware/getUser';
import { User, AccountType, AccountStatus } from '../../../src/entities/User';
import MessageService from '../../../src/services/MessageService';

let app: Express.Application;
let mockedMessageService: MessageService;

beforeAll(async () => {
	mockedMessageService = mock(MessageService);
	container.clearInstances();
	container.register<MessageService>(MessageService, { useValue: instance(mockedMessageService) });

	app = await createApp();
});

beforeEach(() => {
	reset(mockedMessageService);
});

const randomNumber = () => Date.now() + Math.floor(Math.random() * 10e9);
const randomString = () => String(randomNumber());
const randomObject = () => ({ tag: randomString() }) as any;
const testError400 = new APIError(400, 'EventController test error');

describe('MessageController', () => {
	const spiedGetUser = jest.spyOn(getUserMiddleware, 'default');
	const adminUser = users.find(user => user.accountType === AccountType.Admin)!;
	const normalUser = users.find(user => user.accountType === AccountType.User)!;
	const verifiedUser = users.find(user => user.accountType === AccountType.User && user.accountStatus === AccountStatus.Verified)!;

	function setGetUserAllowed(authorization: string, user: User) {
		spiedGetUser.mockImplementation((req, res, next) => {
			if (req.headers.authorization === authorization) res.locals.user = user;
			next();
			return Promise.resolve();
		});
	}

	afterEach(() => {
		spiedGetUser.mockReset();
	});

	describe('createMessage', () => {
		test('200 for valid request', async () => {
			const message = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.createMessage(objectContaining(message))).thenResolve(message);
			const res = await supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)
				.set('Authorization', authorization);
			expect(res.body).toEqual({ message });
			expect(res.status).toEqual(200);
			verify(mockedMessageService.createMessage(objectContaining(message))).once();
		});

		test('401 for missing/invalid authorization', async () => {
			const message = randomObject();
			setGetUserAllowed(randomString(), verifiedUser);
			when(mockedMessageService.createMessage(objectContaining(message))).thenResolve(message);

			await expect(supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)).resolves.toMatchObject({ status: 401 });
			await expect(supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)
				.set('Authorization', 'fake')).resolves.toMatchObject({ status: 401 });
			verify(mockedMessageService.createMessage(objectContaining(message))).never();
		});

		test('Forwards errors from MessageService', async () => {
			const message = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.createMessage(objectContaining(message))).thenReject(testError400);

			await expect(supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)
				.set('Authorization', authorization)).resolves.toMatchObject({
				status: 400,
				body: {
					error: testError400.message
				}
			});
			verify(mockedMessageService.createMessage(objectContaining(message))).once();
		});
	});

	describe('getMessage', () => {
		test('200 for valid request', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessage(objectContaining({ channelID, id }))).thenResolve(message);
			const res = await supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization);
			expect(res.body).toEqual({ message });
			expect(res.status).toEqual(200);
			verify(mockedMessageService.getMessage(objectContaining({ channelID, id }))).once();
		});

		test('401 for missing/invalid authorization', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessage(objectContaining({ channelID, id }))).thenResolve(message);

			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`)).resolves.toMatchObject({ status: 401 });
			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', 'badauth')).resolves.toMatchObject({ status: 401 });
			verify(mockedMessageService.getMessage(objectContaining({ channelID, id }))).never();
		});

		test('Forwards errors from MessageService', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessage(objectContaining({ channelID, id }))).thenReject(testError400);

			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization))
				.resolves.toMatchObject({
					status: 400,
					body: {
						error: testError400.message
					}
				});
			verify(mockedMessageService.getMessage(objectContaining({ channelID, id }))).once();
		});
	});
});
