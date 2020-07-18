import { UserService } from '../../../src/services/UserService';
import EmailService from '../../../src/services/email/EmailService';
import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import { verifyJWT, generateJWT } from '../../../src/util/auth';
import '../../util/dbTeardown';
import { AccountStatus, AccountType, User } from '../../../src/entities/User';
import { EmailConfirmation } from '../../../src/entities/EmailConfirmation';
import Profile from '../../../src/entities/Profile';

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

const confirmationFixture1 = new EmailConfirmation();
const userFixture1 = new User();
Object.assign(userFixture1, {
	accountStatus: AccountStatus.Unverified,
	accountType: AccountType.User,
	email: 'test@gmail.com',
	forename: 'Test',
	surname: 'User',
	id: 'user1',
	password: 'passwordhash salt'
});
Object.assign(confirmationFixture1, {
	id: 'confirmation1',
	user: userFixture1
});

const confirmationFixture2 = new EmailConfirmation();
const userFixture2 = new User();
Object.assign(userFixture2, {
	accountStatus: AccountStatus.Verified,
	accountType: AccountType.User,
	email: 'hello@test.com',
	forename: 'John',
	surname: 'Doe',
	id: 'user2',
	password: 'passwordhash salt'
});
Object.assign(confirmationFixture2, {
	id: 'confirmation2',
	user: userFixture2
});

describe('UserController', () => {
	describe('registerUser', () => {
		test('Gives 204 for valid request', async () => {
			const registrationUser = {
				forename: 'Test',
				surname: 'User',
				password: 'password',
				email: 'test@gmail.com'
			};

			when(mockedEmailService.sendEmail(anything())).thenResolve();
			when(mockedUserService.registerUser(objectContaining(registrationUser))).thenResolve(confirmationFixture1);

			const res = await supertest(app).post('/api/v1/register').send(registrationUser);
			verify(mockedUserService.registerUser(objectContaining(registrationUser))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toEqual(204);
			expect(res.body).toEqual({});
		});

		test('Gives error for invalid request', async () => {
			when(mockedEmailService.sendEmail(anything())).thenResolve();
			when(mockedUserService.registerUser(anything())).thenReject();

			const res = await supertest(app).post('/api/v1/register');
			verify(mockedUserService.registerUser(anything())).called();
			verify(mockedEmailService.sendEmail(anything())).never();
			expect(res.status).toBeGreaterThanOrEqual(400);
		});

		test('Gives error when email fails', async () => {
			const registrationUser = {
				forename: 'John',
				surname: 'Doe',
				password: 'password',
				email: 'hello@test.com'
			};

			when(mockedEmailService.sendEmail(anything())).thenReject();
			when(mockedUserService.registerUser(objectContaining(registrationUser))).thenResolve(confirmationFixture2);

			const res = await supertest(app).post('/api/v1/register').send(registrationUser);
			verify(mockedUserService.registerUser(objectContaining(registrationUser))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe('verifyUserEmail', () => {
		test('Gives 204 for valid request', async () => {
			when(mockedUserService.verifyUserEmail('3')).thenResolve();
			const res = await supertest(app).get('/api/v1/verify?confirmationId=3');
			verify(mockedUserService.verifyUserEmail('3')).called();
			expect(res.status).toEqual(204);
			expect(res.body).toEqual({});
		});

		test('Gives error for invalid request', async () => {
			when(mockedUserService.verifyUserEmail(anything())).thenReject();
			const res = await supertest(app).get('/api/v1/verify?confirmationId=3');
			verify(mockedUserService.verifyUserEmail('3')).called();
			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe('authenticate', () => {
		test('Gives valid token on successful authentication', async () => {
			const fixture = confirmationFixture1.user;
			when(mockedUserService.authenticate(fixture.email, 'password')).thenResolve(fixture);

			const res = await supertest(app).post('/api/v1/authenticate').send({
				email: fixture.email,
				password: 'password'
			});

			const payload = await verifyJWT(res.body.token);
			expect(payload.id).toEqual(confirmationFixture1.user.id);
			expect(Object.keys(payload)).toEqual(['id', 'iat', 'exp']);
		});

		test('Rejects on unsuccessful authentication', async () => {
			const fixture = confirmationFixture2.user;
			when(mockedUserService.authenticate(fixture.email, 'password')).thenResolve(fixture);

			const res = await supertest(app).post('/api/v1/authenticate').send({
				email: fixture.email,
				password: 'incorrect password'
			});
			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.token).toBeUndefined();
		});
	});

	describe('putUserProfile', () => {
		test('Gives 200 for valid request', async () => {
			const fixture = new User();
			Object.assign(fixture, userFixture2);
			const profileData = { yearOfStudy: 2, course: 'International Management' };
			const profile = new Profile();
			Object.assign(profile, profileData);
			profile.id = '123';
			profile.user = fixture;

			when(mockedUserService.findOne(anything())).thenResolve(fixture);
			when(mockedUserService.putUserProfile(anything(), anything())).thenResolve(Object.assign(fixture, { profile }));

			const res = await supertest(app).put('/api/v1/users/@me/profile')
				.set('Authorization', await generateJWT(fixture))
				.send(profileData);

			expect(res.status).toEqual(200);
			expect(res.body.user).toBeTruthy();
			expect(res.body.user.password).toBeUndefined();
			expect(res.body.user.profile.yearOfStudy).toStrictEqual(profile.yearOfStudy);
			expect(res.body.user.profile.course).toStrictEqual(profile.course);
		});

		test('Rejects when invalid data passed', async () => {
			const fixture = new User();
			Object.assign(fixture, userFixture2);
			const profileData = { yearOfStudy: 2.5, course: 'International Management' };
			const profile = new Profile();
			Object.assign(profile, profileData);
			profile.id = '123';
			profile.user = fixture;

			when(mockedUserService.findOne(anything())).thenResolve(fixture);
			when(mockedUserService.putUserProfile(anything(), anything())).thenReject();

			const res = await supertest(app).put('/api/v1/users/@me/profile')
				.set('Authorization', await generateJWT(fixture))
				.send(profileData);

			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.user).toBeUndefined();
		});

		test('Rejects when user not found', async () => {
			const fixture = new User();
			Object.assign(fixture, userFixture2);
			const profileData = { yearOfStudy: 2, course: 'International Management' };
			const profile = new Profile();
			Object.assign(profile, profileData);
			profile.id = '123';
			profile.user = fixture;

			const res = await supertest(app).put('/api/v1/users/@me/profile')
				.set('Authorization', await generateJWT(fixture))
				.send(profileData);

			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.user).toBeUndefined();
		});

		test('Rejects when authorization invalid', async () => {
			const fixture = new User();
			Object.assign(fixture, userFixture2);
			const profileData = { yearOfStudy: 2, course: 'International Management' };
			const profile = new Profile();
			Object.assign(profile, profileData);
			profile.id = '123';
			profile.user = fixture;

			when(mockedUserService.findOne(anything())).thenResolve(fixture);
			when(mockedUserService.putUserProfile(anything(), anything())).thenResolve(Object.assign(fixture, { profile }));

			const res = await supertest(app).put('/api/v1/users/@me/profile').send(profileData);

			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.user).toBeUndefined();
		});
	});

	describe('getUserProfile', () => {
		test('Resolves for @me when user has profile', async () => {
			const fixture = new User();
			Object.assign(fixture, userFixture2);
			const profileData = { yearOfStudy: 2, course: 'International Management' };
			const profile = new Profile();
			Object.assign(profile, profileData);
			profile.id = '123';
			profile.user = fixture;
			fixture.profile = profile;

			when(mockedUserService.findOne(anything())).thenResolve(fixture);

			const res = await supertest(app).get('/api/v1/users/@me/profile')
				.set('Authorization', await generateJWT(fixture));

			expect(res.status).toEqual(200);
			expect(res.body.user).toBeTruthy();
		});

		test('Resolves for another user when user has profile', async () => {
			const otherUser = new User();
			Object.assign(otherUser, userFixture2);
			const profileData = { yearOfStudy: 2, course: 'International Management' };
			const profile = new Profile();
			Object.assign(profile, profileData);
			profile.id = '123';
			profile.user = otherUser;
			otherUser.profile = profile;

			const user = new User();
			Object.assign(user, userFixture2);
			Object.assign(user, { id: '12348920134089' });

			when(mockedUserService.findOne(objectContaining({ id: otherUser.id }))).thenResolve(otherUser);
			when(mockedUserService.findOne(objectContaining({ id: user.id }))).thenResolve(user);

			const res = await supertest(app).get(`/api/v1/users/${otherUser.id}/profile`)
				.set('Authorization', await generateJWT(user));

			expect(res.status).toEqual(200);
			expect(res.body.user).toBeTruthy();
		});

		test('Rejects for @me when user doesn\'t have profile', async () => {
			const fixture = new User();
			Object.assign(fixture, userFixture2);

			when(mockedUserService.findOne(anything())).thenResolve(fixture);

			const res = await supertest(app).get('/api/v1/users/@me/profile')
				.set('Authorization', await generateJWT(fixture));

			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.user).toBeUndefined();
		});

		test('Rejects for another user when user doesn\'t have profile', async () => {
			const otherUser = userFixture2;

			const user = new User();
			Object.assign(user, userFixture2);
			Object.assign(user, { id: '12348920134089' });

			when(mockedUserService.findOne(objectContaining({ id: otherUser.id }))).thenResolve(otherUser);
			when(mockedUserService.findOne(objectContaining({ id: user.id }))).thenResolve(user);

			const res = await supertest(app).get('/api/v1/users/@me/profile')
				.set('Authorization', await generateJWT(user));

			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.user).toBeUndefined();
		});

		test('Rejects for non-existent user', async () => {
			const user = new User();
			Object.assign(user, userFixture2);
			Object.assign(user, { id: '12348920134089' });

			when(mockedUserService.findOne(objectContaining({ id: user.id }))).thenResolve(user);

			const res = await supertest(app).get('/api/v1/users/profile')
				.set('Authorization', await generateJWT(user));

			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.user).toBeUndefined();
		});
	});
});
