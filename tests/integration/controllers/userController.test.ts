import { UserService } from '../../../src/services/UserService';
import EmailService from '../../../src/services/email/EmailService';
import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import * as authUtils from '../../../src/util/auth';
import '../../util/dbTeardown';
import emailConfirmations from '../../fixtures/emailConfirmations';
import users from '../../fixtures/users';
import { APIError, HttpResponseCode } from '../../../src/util/errors';
import * as middleware from '../../../src/routes/middleware/getUser';
import { AccountStatus, User } from '../../../src/entities/User';

let app: Express.Application;
let mockedUserService: UserService;
let mockedEmailService: EmailService;

beforeAll(async () => {
	mockedUserService = mock(UserService);
	mockedEmailService = mock(EmailService);
	container.clearInstances();
	container.register<UserService>(UserService, { useValue: instance(mockedUserService) });
	container.register<EmailService>(EmailService, { useValue: instance(mockedEmailService) });

	app = await createApp();
});

beforeEach(() => {
	reset(mockedUserService);
	reset(mockedEmailService);
});

const randomNumber = () => Date.now() + Math.floor(Math.random() * 10e9);
const randomString = () => String(randomNumber());
const randomObject = () => ({ tag: randomString() }) as any;
const testError400 = new APIError(HttpResponseCode.BadRequest, 'UserController test error');

function clean(obj: Record<string, any>) {
	const output: Record<string, any> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === 'object') output[key] = clean(value);
		else if (typeof value !== 'undefined') output[key] = value;
	}
	return output;
}

describe('UserController', () => {
	const spiedGetUser = jest.spyOn(middleware, 'default');

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

	describe('registerUser', () => {
		test('204 for valid request', async () => {
			const data = randomObject();

			when(mockedUserService.registerUser(anything())).thenResolve(emailConfirmations[0]);
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post('/api/v1/register').send(data);
			verify(mockedUserService.registerUser(objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(HttpResponseCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const data = randomObject();

			when(mockedUserService.registerUser(anything())).thenReject(testError400);
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post('/api/v1/register').send(data);
			verify(mockedUserService.registerUser(objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).never();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});

		test('Forwards errors from EmailService', async () => {
			const data = randomObject();

			when(mockedUserService.registerUser(anything())).thenResolve(emailConfirmations[0]);
			when(mockedEmailService.sendEmail(anything())).thenReject(testError400);

			const res = await supertest(app).post('/api/v1/register').send(data);
			verify(mockedUserService.registerUser(objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('verifyUserEmail', () => {
		test('204 for valid request', async () => {
			const confirmationId = randomString();

			when(mockedUserService.verifyUserEmail(confirmationId)).thenResolve(users[1]);

			const res = await supertest(app).get(`/api/v1/verify?confirmationId=${confirmationId}`);
			verify(mockedUserService.verifyUserEmail(confirmationId)).called();
			expect(res.status).toEqual(HttpResponseCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const confirmationId = randomString();

			when(mockedUserService.verifyUserEmail(confirmationId)).thenReject(testError400);

			const res = await supertest(app).get(`/api/v1/verify?confirmationId=${confirmationId}`);
			verify(mockedUserService.verifyUserEmail(confirmationId)).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('authenticate', () => {
		test('204 for valid request', async () => {
			const [email, password, token] = [randomString(), randomString(), randomString()];

			when(mockedUserService.authenticate(email, password)).thenResolve(users[1]);
			const spy = jest.spyOn(authUtils, 'generateJWT');
			spy.mockImplementation(() => Promise.resolve(token));

			const res = await supertest(app).post(`/api/v1/authenticate`).send({ email, password });
			verify(mockedUserService.authenticate(email, password)).called();
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: users[1].id }));
			expect(res.status).toEqual(HttpResponseCode.Ok);
			expect(res.body).toEqual({ token });
			spy.mockReset();
		});

		test('Forwards errors from UserService', async () => {
			const [email, password, token] = [randomString(), randomString(), randomString()];

			when(mockedUserService.authenticate(email, password)).thenReject(testError400);
			const spy = jest.spyOn(authUtils, 'generateJWT');
			spy.mockImplementation(() => Promise.resolve(token));

			const res = await supertest(app).post(`/api/v1/authenticate`).send({ email, password });
			verify(mockedUserService.authenticate(email, password)).called();
			expect(spy).not.toHaveBeenCalled();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
			spy.mockReset();
		});

		test('Forwards errors from generateJWT', async () => {
			const [email, password] = [randomString(), randomString()];

			when(mockedUserService.authenticate(email, password)).thenResolve(users[1]);
			const spy = jest.spyOn(authUtils, 'generateJWT');
			spy.mockImplementation(() => Promise.reject(testError400));

			const res = await supertest(app).post(`/api/v1/authenticate`).send({ email, password });
			verify(mockedUserService.authenticate(email, password)).called();
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: users[1].id }));
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
			spy.mockReset();
		});
	});

	describe('getUser', () => {
		test('200 for valid request (@me)', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified && user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, user!);

			when(mockedUserService.findOne(objectContaining({ id: user!.id }))).thenResolve(user);
			const res = await supertest(app).get(`/api/v1/users/@me`).set('Authorization', authorization);
			expect(clean(res.body)).toEqual(clean({ user: user!.toLimitedJSON() }));
			expect(res.status).toEqual(HttpResponseCode.Ok);
		});

		test('200 for valid request (other user)', async () => {
			const [userMe, userOther] = users.filter(user => user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, userMe);

			when(mockedUserService.findOne(objectContaining({ id: userMe.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: userOther.id }))).thenResolve(userOther);
			const res = await supertest(app).get(`/api/v1/users/${userOther.id}`).set('Authorization', authorization);
			expect(clean(res.body)).toEqual(clean({ user: userOther.toLimitedJSON() }));
			expect(res.status).toEqual(HttpResponseCode.Ok);
		});

		test('Forwards errors from UserService', async () => {
			const [userMe, userOther] = users.filter(user => user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, userMe);

			when(mockedUserService.findOne(objectContaining({ id: userMe.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: userOther.id }))).thenReject(testError400);
			const res = await supertest(app).get(`/api/v1/users/${userOther.id}`).set('Authorization', authorization);
			expect(res.body).toEqual({ error: testError400.message });
			expect(res.status).toEqual(HttpResponseCode.BadRequest);
		});

		test('200 when user has no profile', async () => {
			const userMe = users.find(user => user.profile);
			const userOther = users.find(user => !user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, userMe!);

			when(mockedUserService.findOne(objectContaining({ id: userMe!.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: userOther!.id }))).thenResolve(userOther);
			const res = await supertest(app).get(`/api/v1/users/${userOther!.id}`).set('Authorization', authorization);
			expect(res.status).toEqual(HttpResponseCode.Ok);
			expect(clean(res.body)).toEqual(clean({ user: userOther!.toLimitedJSON() }));
		});

		test('404 when user does not exist', async () => {
			const userMe = users.find(user => user.profile);
			const authorization = randomString();
			const userOther = randomString();
			setGetUserAllowed(authorization, userMe!);

			when(mockedUserService.findOne(objectContaining({ id: userMe!.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: randomString() }))).thenResolve(undefined);
			const res = await supertest(app).get(`/api/v1/users/${userOther}`).set('Authorization', authorization);
			expect(res.status).toEqual(HttpResponseCode.NotFound);
		});
	});

	describe('putUserProfile', () => {
		test('200 for valid request', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			const [randomInput, randomOutput] = [randomObject(), randomObject()];
			setGetUserAllowed(authorization, user!);

			when(mockedUserService.putUserProfile(user!.id, objectContaining(randomInput))).thenResolve(randomOutput);
			const res = await supertest(app).put(`/api/v1/users/@me/profile`)
				.set('Authorization', authorization)
				.send(randomInput);
			verify(mockedUserService.putUserProfile(user!.id, objectContaining(randomInput))).called();
			expect(res.status).toEqual(HttpResponseCode.Ok);
			expect(res.body).toEqual({ user: randomOutput });
		});

		test('Forwards errors from UserService', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			const randomInput = randomObject();
			setGetUserAllowed(authorization, user!);

			when(mockedUserService.putUserProfile(user!.id, objectContaining(randomInput))).thenReject(testError400);
			const res = await supertest(app).put(`/api/v1/users/@me/profile`)
				.set('Authorization', authorization)
				.send(randomInput);
			verify(mockedUserService.putUserProfile(user!.id, objectContaining(randomInput))).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});
});
