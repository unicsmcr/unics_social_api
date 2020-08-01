import { createApp } from '../../../src';
import { mock, instance, when, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import '../../util/dbTeardown';
import users from '../../fixtures/users';
import { APIError, HttpCode } from '../../../src/util/errors';
import * as getUserMiddleware from '../../../src/routes/middleware/getUser';
import * as getChannelMiddleware from '../../../src/routes/middleware/getChannel';
import { User, AccountType, AccountStatus } from '../../../src/entities/User';
import MessageService from '../../../src/services/MessageService';
import { Channel } from '../../../src/entities/Channel';
import events from '../../fixtures/events';

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
const testError400 = new APIError(HttpCode.BadRequest, 'EventController test error');

describe('MessageController', () => {
	const spiedGetUser = jest.spyOn(getUserMiddleware, 'default');
	const spiedGetChannel = jest.spyOn(getChannelMiddleware, 'default');
	const adminUser = users.find(user => user.accountType === AccountType.Admin)!;
	const verifiedUser = users.find(user => user.accountType === AccountType.User && user.accountStatus === AccountStatus.Verified)!;
	const eventChannel = events[0].channel;

	function setGetUserAllowed(authorization: string, user: User) {
		spiedGetUser.mockImplementation((req, res, next) => {
			if (req.headers.authorization === authorization) res.locals.user = user;
			next();
			return Promise.resolve();
		});
	}

	function setChannelMiddleware(id: string, channel: Channel) {
		spiedGetChannel.mockImplementation((req, res, next) => {
			if (req.params.channelID === id) (res.locals as any).channel = channel;
			next();
			return Promise.resolve();
		});
	}

	setChannelMiddleware('id_placeholder', eventChannel);

	afterEach(() => {
		spiedGetUser.mockReset();
	});

	describe('createMessage', () => {
		test('Ok response for valid request', async () => {
			const message = randomObject();
			const authorization = randomString();
			const expectedInput = objectContaining({ ...message, author: verifiedUser, channel: eventChannel });
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.createMessage(expectedInput)).thenResolve(message);
			const res = await supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)
				.set('Authorization', authorization);
			expect(res.body).toEqual({ message });
			expect(res.status).toEqual(HttpCode.Ok);
			verify(mockedMessageService.createMessage(expectedInput)).once();
		});

		test('Unauthorized response for missing/invalid authorization', async () => {
			const message = randomObject();
			setGetUserAllowed(randomString(), verifiedUser);
			when(mockedMessageService.createMessage(objectContaining(message))).thenResolve(message);

			await expect(supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			await expect(supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)
				.set('Authorization', 'fake')).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			verify(mockedMessageService.createMessage(objectContaining(message))).never();
		});

		test('Forwards errors from MessageService', async () => {
			const message = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.createMessage(objectContaining(message))).thenReject(testError400);

			await expect(supertest(app).post('/api/v1/channels/id_placeholder/messages').send(message)
				.set('Authorization', authorization)).resolves.toMatchObject({
				status: HttpCode.BadRequest,
				body: {
					error: testError400.message
				}
			});
			verify(mockedMessageService.createMessage(objectContaining(message))).once();
		});
	});

	describe('getMessage', () => {
		test('Ok response for valid request', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessage(objectContaining({ channelID, id }))).thenResolve(message);
			const res = await supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization);
			expect(res.body).toEqual({ message });
			expect(res.status).toEqual(HttpCode.Ok);
			verify(mockedMessageService.getMessage(objectContaining({ channelID, id }))).once();
		});

		test('Unauthorized response for missing/invalid authorization', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessage(objectContaining({ channelID, id }))).thenResolve(message);

			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`)).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', 'badauth')).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			verify(mockedMessageService.getMessage(objectContaining({ channelID, id }))).never();
		});

		test('Forwards errors from MessageService', async () => {
			const channelID = randomString();
			const id = randomString();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessage(objectContaining({ channelID, id }))).thenReject(testError400);

			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization))
				.resolves.toMatchObject({
					status: HttpCode.BadRequest,
					body: {
						error: testError400.message
					}
				});
			verify(mockedMessageService.getMessage(objectContaining({ channelID, id }))).once();
		});
	});

	describe('getMessages', () => {
		test('Ok response for valid request', async () => {
			const channelID = randomString();
			const messages = [randomObject(), randomObject()];

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessages(objectContaining({ channelID }))).thenResolve(messages);
			const res = await supertest(app).get(`/api/v1/channels/${channelID}/messages`).set('Authorization', authorization);
			expect(res.body).toEqual({ messages });
			expect(res.status).toEqual(HttpCode.Ok);
			verify(mockedMessageService.getMessages(objectContaining({ channelID }))).once();
		});

		test('Unauthorized response for missing/invalid authorization', async () => {
			const channelID = randomString();
			const messages = [randomObject(), randomObject()];

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessages(objectContaining({ channelID }))).thenResolve(messages);

			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages`)).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages`).set('Authorization', 'badauth')).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			verify(mockedMessageService.getMessages(objectContaining({ channelID }))).never();
		});

		test('Forwards errors from MessageService', async () => {
			const channelID = randomString();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.getMessages(objectContaining({ channelID }))).thenReject(testError400);

			await expect(supertest(app).get(`/api/v1/channels/${channelID}/messages`).set('Authorization', authorization))
				.resolves.toMatchObject({
					status: HttpCode.BadRequest,
					body: {
						error: testError400.message
					}
				});
			verify(mockedMessageService.getMessages(objectContaining({ channelID }))).once();
		});
	});

	describe('deleteMessage', () => {
		test('No content response for valid request', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: verifiedUser.id }))).thenResolve(message);
			const res = await supertest(app).delete(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization);
			expect(res.status).toEqual(HttpCode.NoContent);
			verify(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: verifiedUser.id }))).once();
		});

		test('Admin request passes no authorID', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, adminUser);
			when(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: undefined }))).thenResolve(message);
			const res = await supertest(app).delete(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization);
			expect(res.status).toEqual(HttpCode.NoContent);
			verify(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: undefined }))).once();
		});

		test('Unauthorized response for missing/invalid authorization', async () => {
			const channelID = randomString();
			const id = randomString();
			const message = randomObject();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: verifiedUser.id }))).thenResolve(message);

			await expect(supertest(app).delete(`/api/v1/channels/${channelID}/messages/${id}`)).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			await expect(supertest(app).delete(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', 'badauth')).resolves.toMatchObject({ status: HttpCode.Unauthorized });
			verify(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: verifiedUser.id }))).never();
		});

		test('Forwards errors from MessageService', async () => {
			const channelID = randomString();
			const id = randomString();

			const authorization = randomString();
			setGetUserAllowed(authorization, verifiedUser);
			when(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: verifiedUser.id }))).thenReject(testError400);

			await expect(supertest(app).delete(`/api/v1/channels/${channelID}/messages/${id}`).set('Authorization', authorization))
				.resolves.toMatchObject({
					status: HttpCode.BadRequest,
					body: {
						error: testError400.message
					}
				});
			verify(mockedMessageService.deleteMessage(objectContaining({ channelID, id, authorID: verifiedUser.id }))).once();
		});
	});
});
