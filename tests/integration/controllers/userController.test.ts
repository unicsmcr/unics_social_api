import { UserService } from '../../../src/services/UserService';
import { createApp } from '../../../src';
import { mock, instance, when, anything, verify, objectContaining, reset } from 'ts-mockito';
import { container } from 'tsyringe';
import supertest from 'supertest';
import '../../util/dbTeardown';

let app: Express.Application;
let mockedUserService: UserService;

beforeAll(async () => {
	mockedUserService = mock(UserService);
	container.clearInstances();
	container.register<UserService>(UserService, { useValue: instance(mockedUserService) });

	app = await createApp();
});

beforeEach(() => {
	reset(mockedUserService);
});

describe('UserController', () => {
	describe('registerUser', () => {
		test('Gives 204 for valid request', async () => {
			const registrationUser = {
				forename: 'Bob',
				surname: 'Builder',
				password: 'password',
				email: 'email'
			};

			when(mockedUserService.registerUser(objectContaining(registrationUser))).thenResolve();
			const res = await supertest(app).post('/api/v1/register').send(registrationUser);
			verify(mockedUserService.registerUser(objectContaining(registrationUser))).called();
			expect(res.status).toEqual(204);
			expect(res.body).toEqual({});
		});

		test('Gives error for invalid request', async () => {
			when(mockedUserService.registerUser(anything())).thenReject();
			const res = await supertest(app).post('/api/v1/register');
			verify(mockedUserService.registerUser(anything())).called();
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
