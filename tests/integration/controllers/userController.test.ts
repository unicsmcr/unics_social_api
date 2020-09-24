import { UserService } from '../../../src/services/UserService';
import { NoteService } from '../../../src/services/NoteService';
import { ProfileService } from '../../../src/services/ProfileService';
import EmailService from '../../../src/services/email/EmailService';
import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import * as authUtils from '../../../src/util/auth';
import users from '../../fixtures/users';
import { APIError, HttpCode } from '../../../src/util/errors';
import * as middleware from '../../../src/routes/middleware/getUser';
import { AccountStatus, User } from '../../../src/entities/User';

let app: Express.Application;
let mockedUserService: UserService;
let mockedProfileService: ProfileService;
let mockedEmailService: EmailService;
let mockedNoteService: NoteService;

const spiedGetUserReqs = {
	authorization: '',
	user: null
};

function setGetUserAllowed(authorization: string, user: User) {
	Object.assign(spiedGetUserReqs, { authorization, user });
}

beforeAll(async () => {
	const spiedGetUser = jest.spyOn(middleware, 'default');
	spiedGetUser.mockImplementation(() => (req, res, next) => {
		if (req.headers.authorization === spiedGetUserReqs.authorization) res.locals.user = spiedGetUserReqs.user as unknown as User;
		next();
		return Promise.resolve();
	});

	mockedUserService = mock(UserService);
	mockedEmailService = mock(EmailService);
	mockedNoteService = mock(NoteService);

	mockedProfileService = mock(ProfileService);
	container.clearInstances();
	container.register<UserService>(UserService, { useValue: instance(mockedUserService) });
	container.register<ProfileService>(ProfileService, { useValue: instance(mockedProfileService) });
	container.register<EmailService>(EmailService, { useValue: instance(mockedEmailService) });
	container.register<NoteService>(NoteService, { useValue: instance(mockedNoteService) });

	app = await createApp();
});

beforeEach(() => {
	Object.assign(spiedGetUserReqs, { authorization: '', user: null });
	reset(mockedUserService);
	reset(mockedEmailService);
	reset(mockedNoteService);
	reset(mockedProfileService);
});

const randomNumber = () => Date.now() + Math.floor(Math.random() * 10e9);
const randomString = () => String(randomNumber());
const randomObject = () => ({ tag: randomString() }) as any;
const testError400 = new APIError(HttpCode.BadRequest, 'UserController test error');

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

	afterEach(() => {
		spiedGetUser.mockReset();
	});

	describe('registerUser', () => {
		test('No content response for valid request', async () => {
			const data = randomObject();

			when(mockedUserService.registerUser(anything())).thenResolve(users[0]);
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post('/api/v1/register').send(data);
			verify(mockedUserService.registerUser(objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(HttpCode.NoContent);
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

			when(mockedUserService.registerUser(anything())).thenResolve(users[0]);
			when(mockedEmailService.sendEmail(anything())).thenReject(testError400);

			const res = await supertest(app).post('/api/v1/register').send(data);
			verify(mockedUserService.registerUser(objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('verifyUserEmail', () => {
		test('No content response for valid request', async () => {
			const token = randomString();
			const user = users[1];
			setGetUserAllowed(token, user);

			when(mockedUserService.verifyUserEmail(user.id)).thenResolve({ ...users[1] });

			const res = await supertest(app).get(`/api/v1/verify`).set('Authorization', token);
			verify(mockedUserService.verifyUserEmail(user.id)).called();
			expect(res.status).toEqual(HttpCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const token = randomString();
			const user = users[1];
			setGetUserAllowed(token, user);

			when(mockedUserService.verifyUserEmail(user.id)).thenReject(testError400);

			const res = await supertest(app).get(`/api/v1/verify`).set('Authorization', token);
			verify(mockedUserService.verifyUserEmail(user.id)).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('authenticate', () => {
		test('No content response for valid request', async () => {
			const [email, password, token] = [randomString(), randomString(), randomString()];

			when(mockedUserService.authenticate(email, password)).thenResolve({ ...users[1] });
			const spy = jest.spyOn(authUtils, 'generateJWT');
			spy.mockImplementation(() => Promise.resolve(token));

			const res = await supertest(app).post(`/api/v1/authenticate`).send({ email, password });
			verify(mockedUserService.authenticate(email, password)).called();
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: users[1].id }));
			expect(res.status).toEqual(HttpCode.Ok);
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

			when(mockedUserService.authenticate(email, password)).thenResolve({ ...users[1] });
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

	describe('forgotPassword', () => {
		test('No content response for valid request', async () => {
			const data = { email: randomString() };

			when(mockedUserService.forgotPassword(anything())).thenResolve(users[1]);
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post('/api/v1/forgot_password').send(data);
			verify(mockedUserService.forgotPassword(data.email)).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(HttpCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const data = { email: randomString() };

			when(mockedUserService.forgotPassword(anything())).thenReject(testError400);
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post('/api/v1/forgot_password').send(data);
			verify(mockedUserService.forgotPassword(data.email)).called();
			verify(mockedEmailService.sendEmail(anything())).never();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});

		test('Forwards errors from EmailService', async () => {
			const data = { email: randomString() };

			when(mockedUserService.forgotPassword(anything())).thenResolve(users[1]);
			when(mockedEmailService.sendEmail(anything())).thenReject(testError400);

			const res = await supertest(app).post('/api/v1/forgot_password').send(data);
			verify(mockedUserService.forgotPassword(data.email)).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});

		test('Forwards errors from generateJWT', async () => {
			const data = { email: randomString() };

			when(mockedUserService.forgotPassword(anything())).thenResolve(users[1]);
			const spy = jest.spyOn(authUtils, 'generateJWT');
			spy.mockImplementation(() => Promise.reject(testError400));

			const res = await supertest(app).post('/api/v1/forgot_password').send(data);
			verify(mockedUserService.forgotPassword(data.email)).called();
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: users[1].id }));
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
			spy.mockReset();
		});
	});

	describe('resetPassword', () => {
		test('No content response for valid request', async () => {
			const data = randomObject();
			const user = users[1];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedUserService.resetPassword(user.id, anything())).thenResolve(users[1]);

			const res = await supertest(app).post('/api/v1/reset_password')
				.send(data)
				.set('Authorization', authorization);
			verify(mockedUserService.resetPassword(user.id, objectContaining(data))).called();
			expect(res.status).toEqual(HttpCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const data = randomObject();
			const user = users[1];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedUserService.resetPassword(user.id, anything())).thenReject(testError400);

			const res = await supertest(app).post('/api/v1/reset_password')
				.send(data)
				.set('Authorization', authorization);
			verify(mockedUserService.resetPassword(user.id, objectContaining(data))).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('getUser', () => {
		test('Ok response for valid request (@me)', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified && user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, user!);

			when(mockedUserService.findOne(objectContaining({ id: user!.id }))).thenResolve(user);
			const res = await supertest(app).get(`/api/v1/users/@me`).set('Authorization', authorization);
			expect(clean(res.body)).toEqual(clean({ user: user!.toJSON() }));
			expect(res.status).toEqual(HttpCode.Ok);
		});

		test('Ok response for valid request (other user)', async () => {
			const [userMe, userOther] = users.filter(user => user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, userMe);

			when(mockedUserService.findOne(objectContaining({ id: userMe.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: userOther.id }))).thenResolve(userOther);
			const res = await supertest(app).get(`/api/v1/users/${userOther.id}`).set('Authorization', authorization);
			expect(clean(res.body)).toEqual(clean({ user: userOther.toJSON() }));
			expect(res.status).toEqual(HttpCode.Ok);
		});

		test('Forwards errors from UserService', async () => {
			const [userMe, userOther] = users.filter(user => user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, userMe);

			when(mockedUserService.findOne(objectContaining({ id: userMe.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: userOther.id }))).thenReject(testError400);
			const res = await supertest(app).get(`/api/v1/users/${userOther.id}`).set('Authorization', authorization);
			expect(res.body).toEqual({ error: testError400.message });
			expect(res.status).toEqual(HttpCode.BadRequest);
		});

		test('Ok response when user has no profile', async () => {
			const userMe = users.find(user => user.profile);
			const userOther = users.find(user => !user.profile);
			const authorization = randomString();
			setGetUserAllowed(authorization, userMe!);

			when(mockedUserService.findOne(objectContaining({ id: userMe!.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: userOther!.id }))).thenResolve(userOther);
			const res = await supertest(app).get(`/api/v1/users/${userOther!.id}`).set('Authorization', authorization);
			expect(res.status).toEqual(HttpCode.Ok);
			expect(clean(res.body)).toEqual(clean({ user: userOther!.toJSON() }));
		});

		test('Not found error when user does not exist', async () => {
			const userMe = users.find(user => user.profile);
			const authorization = randomString();
			const userOther = randomString();
			setGetUserAllowed(authorization, userMe!);

			when(mockedUserService.findOne(objectContaining({ id: userMe!.id }))).thenResolve(userMe);
			when(mockedUserService.findOne(objectContaining({ id: randomString() }))).thenResolve(undefined);
			const res = await supertest(app).get(`/api/v1/users/${userOther}`).set('Authorization', authorization);
			expect(res.status).toEqual(HttpCode.NotFound);
		});
	});

	describe('getNotes', () => {
		test('Notes returned for valid request', async () => {
			const user = users[1];
			const output = [user.notes![0].toJSON()];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedNoteService.getNotes(user.id)).thenResolve(output);

			const res = await supertest(app).get(`/api/v1/users/@me/notes`)
				.set('Authorization', authorization);
			verify(mockedNoteService.getNotes(user.id)).called();
			expect(res.status).toEqual(HttpCode.Ok);
			expect(res.body).toEqual({ notes: output });
		});

		test('Forwards errors from UserService', async () => {
			const user = users[1];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedNoteService.getNotes(user.id)).thenReject(testError400);

			const res = await supertest(app).get(`/api/v1/users/@me/notes`)
				.set('Authorization', authorization);
			verify(mockedNoteService.getNotes(user.id)).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('createNote', () => {
		test('Note returned for valid request', async () => {
			const data = randomObject();
			const user = users[1];
			const target = users[0];
			const output = user.notes![0].toJSON();
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedNoteService.createNote(user.id, target.id, anything())).thenResolve(output);

			const res = await supertest(app).put(`/api/v1/users/@me/notes/${target.id}`)
				.set('Authorization', authorization)
				.send(data);
			verify(mockedNoteService.createNote(user.id, target.id, objectContaining(data))).called();
			expect(res.status).toEqual(HttpCode.Ok);
			expect(res.body).toEqual({ note: output });
		});

		test('Forwards errors from UserService', async () => {
			const data = randomObject();
			const user = users[1];
			const target = users[0];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedNoteService.createNote(user.id, target.id, anything())).thenReject(testError400);

			const res = await supertest(app).put(`/api/v1/users/@me/notes/${target.id}`)
				.set('Authorization', authorization)
				.send(data);
			verify(mockedNoteService.createNote(user.id, target.id, objectContaining(data))).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('deleteNote', () => {
		test('No Content returned for valid request', async () => {
			const user = users[1];
			const target = users[0];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedNoteService.deleteNote(user.id, target.id)).thenResolve();

			const res = await supertest(app).delete(`/api/v1/users/@me/notes/${target.id}`)
				.set('Authorization', authorization);
			verify(mockedNoteService.deleteNote(user.id, target.id)).called();
			expect(res.status).toEqual(HttpCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const user = users[1];
			const target = users[0];
			const authorization = randomString();
			setGetUserAllowed(authorization, user);

			when(mockedNoteService.deleteNote(user.id, target.id)).thenReject(testError400);

			const res = await supertest(app).delete(`/api/v1/users/@me/notes/${target.id}`)
				.set('Authorization', authorization);
			verify(mockedNoteService.deleteNote(user.id, target.id)).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('reportUser', () => {
		test('No content response for valid request', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			setGetUserAllowed(authorization, user!);

			const data = randomObject();
			const userMe = users[1];
			const userOther = users.find(user => user.reports);

			when(mockedUserService.reportUser(userMe.id, userOther!.id, anything())).thenResolve(userOther!.reports![0].toJSON());
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post(`/api/v1/users/${userOther!.id}/report`)
				.set('Authorization', authorization)
				.send(data);
			verify(mockedUserService.reportUser(userMe.id, userOther!.id, objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(HttpCode.NoContent);
			expect(res.body).toEqual({});
		});

		test('Forwards errors from UserService', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			setGetUserAllowed(authorization, user!);

			const data = randomObject();
			const userMe = users[1];
			const userOther = users.find(user => user.reports);

			when(mockedUserService.reportUser(userMe.id, userOther!.id, anything())).thenReject(testError400);
			when(mockedEmailService.sendEmail(anything())).thenResolve();

			const res = await supertest(app).post(`/api/v1/users/${userOther!.id}/report`)
				.set('Authorization', authorization)
				.send(data);
			verify(mockedUserService.reportUser(userMe.id, userOther!.id, objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).never();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});

		test('Forwards errors from EmailService', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			setGetUserAllowed(authorization, user!);

			const data = randomObject();
			const userMe = users[1];
			const userOther = users.find(user => user.reports);

			when(mockedUserService.reportUser(userMe.id, userOther!.id, anything())).thenResolve(userOther!.reports![0].toJSON());
			when(mockedEmailService.sendEmail(anything())).thenReject(testError400);

			const res = await supertest(app).post(`/api/v1/users/${userOther!.id}/report`)
				.set('Authorization', authorization)
				.send(data);
			verify(mockedUserService.reportUser(userMe.id, userOther!.id, objectContaining(data))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});

	describe('putUserProfile', () => {
		test('Ok response for valid request', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			const [randomInput, randomOutput] = [randomObject(), randomObject()];
			setGetUserAllowed(authorization, user!);

			when(mockedProfileService.putUserProfile(user!.id, objectContaining(randomInput), anything())).thenResolve(randomOutput);
			const res = await supertest(app).put(`/api/v1/users/@me/profile`)
				.set('Authorization', authorization)
				.send(randomInput);
			verify(mockedProfileService.putUserProfile(user!.id, objectContaining(randomInput), undefined)).called();
			expect(res.status).toEqual(HttpCode.Ok);
			expect(res.body).toEqual({ user: randomOutput });
		});

		test('Forwards errors from UserService', async () => {
			const user = users.find(user => user.accountStatus === AccountStatus.Verified);
			const authorization = randomString();
			const randomInput = randomObject();
			setGetUserAllowed(authorization, user!);

			when(mockedProfileService.putUserProfile(user!.id, objectContaining(randomInput), anything())).thenReject(testError400);
			const res = await supertest(app).put(`/api/v1/users/@me/profile`)
				.set('Authorization', authorization)
				.send(randomInput);
			verify(mockedProfileService.putUserProfile(user!.id, objectContaining(randomInput), undefined)).called();
			expect(res.status).toEqual(testError400.httpCode);
			expect(res.body).toEqual({ error: testError400.message });
		});
	});
});
