import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import '../../util/dbTeardown';
import users from '../../fixtures/users';
import { APIError } from '../../../src/util/errors';
import * as middleware from '../../../src/routes/middleware/getUser';
import { User, AccountType } from '../../../src/entities/User';
import EventService from '../../../src/services/EventService';

let app: Express.Application;
let mockedEventService: EventService;

beforeAll(async () => {
	mockedEventService = mock(EventService);
	container.clearInstances();
	container.register<EventService>(EventService, { useValue: instance(mockedEventService) });

	app = await createApp();
});

beforeEach(() => {
	reset(mockedEventService);
});

const randomNumber = () => Date.now() + Math.floor(Math.random() * 10e9);
const randomString = () => String(randomNumber());
const randomObject = () => ({ tag: randomString() }) as any;
const testError400 = new APIError(400, 'EventController test error');

describe('EventController', () => {
	const spiedGetUser = jest.spyOn(middleware, 'default');
	const adminUser = users.find(user => user.accountType === AccountType.Admin)!;
	const normalUser = users.find(user => user.accountType === AccountType.User)!;

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

	describe('createEvent', () => {
		test('200 for valid request', async () => {
			const event = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, adminUser);
			when(mockedEventService.createEvent(objectContaining(event))).thenResolve(event);

			const res = await supertest(app).post('/api/v1/events').send(event)
				.set('Authorization', authorization);
			verify(mockedEventService.createEvent(objectContaining(event))).called();
			expect(res.status).toEqual(200);
			expect(res.body).toEqual({ event });
		});

		test('401 for missing/invalid authorization', async () => {
			const event = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, adminUser);
			when(mockedEventService.createEvent(objectContaining(event))).thenResolve(event);

			let res = await supertest(app).post('/api/v1/events').send(event);
			expect(res.status).toEqual(401);

			res = await supertest(app).post('/api/v1/events').send(event)
				.set('Authorization', 'invalidauth');
			expect(res.status).toEqual(401);
			verify(mockedEventService.createEvent(objectContaining(event))).never();
		});

		test('403 for non-admin user', async () => {
			const event = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, normalUser);
			when(mockedEventService.createEvent(objectContaining(event))).thenResolve(event);

			const res = await supertest(app).post('/api/v1/events').send(event)
				.set('Authorization', authorization);
			expect(res.status).toEqual(403);
			verify(mockedEventService.createEvent(objectContaining(event))).never();
		});

		test('Forwards errors from EventService', async () => {
			const event = randomObject();
			const authorization = randomString();
			setGetUserAllowed(authorization, adminUser);
			when(mockedEventService.createEvent(anything())).thenReject(testError400);

			const res = await supertest(app).post('/api/v1/events').send(event)
				.set('Authorization', authorization);
			expect(res.status).toEqual(400);
			expect(res.body).toEqual({ error: testError400.message });
			verify(mockedEventService.createEvent(objectContaining(event))).once();
		});
	});
});
