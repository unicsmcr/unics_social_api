import { UserService } from '../../../src/services/UserService';
import EmailService from '../../../src/services/EmailService';
import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import { verifyJWT } from '../../../src/util/auth';
import '../../util/dbTeardown';
import { AccountStatus, AccountType, User } from '../../../src/entities/User';
import { EmailConfirmation } from '../../../src/entities/EmailConfirmation';

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
Object.assign(userFixture1, {
	accountStatus: AccountStatus.Unverified,
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

		test('Gives error when confirmation id not provided', async () => {
			when(mockedUserService.verifyUserEmail(anything())).thenResolve();
			const res = await supertest(app).get('/api/v1/verify');
			verify(mockedUserService.verifyUserEmail(anything())).never();
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
});
