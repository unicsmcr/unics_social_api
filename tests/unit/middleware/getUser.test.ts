import 'reflect-metadata';

import getUser from '../../../src/routes/middleware/getUser';
import { UserService } from '../../../src/services/UserService';
import { container } from 'tsyringe';
import { mock, instance, when, objectContaining } from 'ts-mockito';
import { User, AccountType, AccountStatus } from '../../../src/entities/User';
import { generateJWT, TokenType } from '../../../src/util/auth';
import { sign } from 'jsonwebtoken';
import { getConfig } from '../../../src/util/config';

let mockedUserService: UserService;

const fixture = new User();
fixture.id = '21202120212';
fixture.forename = 'Test';
fixture.surname = 'User';
fixture.email = 'test@gmail.com';
fixture.accountType = AccountType.User;
fixture.accountStatus = AccountStatus.Verified;
const type = TokenType.Auth;

beforeAll(() => {
	mockedUserService = mock(UserService);
	container.clearInstances();
	container.register<UserService>(UserService, { useValue: instance(mockedUserService) });

	when(mockedUserService.findOne(objectContaining({ id: fixture.id }))).thenResolve(fixture);
});

describe('getUser middleware', () => {
	test('Resolves user with valid JWT', async () => {
		const authorization = await generateJWT({ ...fixture, tokenType: type });
		const req: any = { headers: { authorization } };
		const res: any = { locals: {} };
		const next: any = jest.fn();
		await getUser(type)(req, res, next);
		expect(res.locals.user).toEqual(fixture);
		expect(next).toHaveBeenCalledWith();
	});

	test('Errors when invalid authorization passed', async () => {
		const authorization = `${await generateJWT({ ...fixture, tokenType: type })}123`;
		const req: any = { headers: { authorization } };
		const res: any = { locals: {} };
		const next = jest.fn();
		await getUser(type)(req, res, next);
		expect(res.locals.user).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
	});

	test('Errors when no authorization passed', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: {} };
		const next = jest.fn();
		await getUser(type)(req, res, next);
		expect(res.locals.user).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
	});

	test('Errors if JWT does not contain id', async () => {
		// This shouldn't really ever happen, but just in case!
		const authorization = sign({}, getConfig().jwtSecret);
		const req: any = { headers: { authorization } };
		const res: any = { locals: {} };
		const next = jest.fn();
		await getUser(type)(req, res, next);
		expect(res.locals.user).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
	});

	test('Errors when user does not exist passed', async () => {
		const authorization = await generateJWT({ id: '0123', tokenType: type });
		const req: any = { headers: { authorization } };
		const res: any = { locals: {} };
		const next = jest.fn();
		await getUser(type)(req, res, next);
		expect(res.locals.user).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
	});
});
