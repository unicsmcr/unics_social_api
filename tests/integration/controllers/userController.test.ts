import { UserService } from '../../../src/services/UserService';
import EmailService from '../../../src/services/EmailService';
import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import '../../util/dbTeardown';
import { AccountStatus, AccountType } from '../../../src/entities/User';

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

const registeredUserFixture1 = {
	id: 'confirmation1',
	user: {
		accountStatus: AccountStatus.Unverified,
		accountType: AccountType.User,
		email: 'test@gmail.com',
		forename: 'Test',
		surname: 'User',
		id: 'user1',
		password: 'passwordhash salt'
	}
};

const registeredUserFixture2 = {
	id: 'confirmation2',
	user: {
		accountStatus: AccountStatus.Unverified,
		accountType: AccountType.User,
		email: 'hello@test.com',
		forename: 'John',
		surname: 'Doe',
		id: 'user2',
		password: 'passwordhash salt'
	}
};

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
			when(mockedUserService.registerUser(objectContaining(registrationUser))).thenResolve(registeredUserFixture1);

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
			when(mockedUserService.registerUser(objectContaining(registrationUser))).thenResolve(registeredUserFixture2);

			const res = await supertest(app).post('/api/v1/register').send(registrationUser);
			verify(mockedUserService.registerUser(objectContaining(registrationUser))).called();
			verify(mockedEmailService.sendEmail(anything())).called();
			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe('verifyUser', () => {
		test('Gives 204 for valid request', async () => {
			when(mockedUserService.verifyUser('3')).thenResolve();
			const res = await supertest(app).get('/api/v1/verify?confirmationId=3');
			verify(mockedUserService.verifyUser('3')).called();
			expect(res.status).toEqual(204);
			expect(res.body).toEqual({});
		});

		test('Gives error for invalid request', async () => {
			when(mockedUserService.verifyUser(anything())).thenReject();
			const res = await supertest(app).get('/api/v1/verify?confirmationId=3');
			verify(mockedUserService.verifyUser('3')).called();
			expect(res.status).toBeGreaterThanOrEqual(400);
		});

		test('Gives error when confirmation id not provided', async () => {
			when(mockedUserService.verifyUser(anything())).thenResolve();
			const res = await supertest(app).get('/api/v1/verify');
			verify(mockedUserService.verifyUser(anything())).never();
			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});
});
