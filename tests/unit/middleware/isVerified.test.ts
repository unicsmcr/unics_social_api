import 'reflect-metadata';

import isVerified from '../../../src/routes/middleware/isVerified';
import { User, AccountType, AccountStatus } from '../../../src/entities/User';

const verifiedFixture = new User();
verifiedFixture.id = '21202120212';
verifiedFixture.forename = 'Test';
verifiedFixture.surname = 'User';
verifiedFixture.email = 'test@gmail.com';
verifiedFixture.accountType = AccountType.User;
verifiedFixture.accountStatus = AccountStatus.Verified;

const unverifiedFixture = new User();
Object.assign(unverifiedFixture, verifiedFixture);
unverifiedFixture.accountStatus = AccountStatus.Unverified;

const restrictedFixture = new User();
Object.assign(restrictedFixture, verifiedFixture);
restrictedFixture.accountStatus = AccountStatus.Restricted;

describe('isVerified middleware', () => {
	test('Resolves if account status is verified', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: { user: verifiedFixture } };
		const next: any = jest.fn();
		await isVerified(req, res, next);
		expect(next).toHaveBeenCalledWith();
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('Rejects if account status is unverified', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: { user: unverifiedFixture } };
		const next: any = jest.fn();
		await isVerified(req, res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('Rejects if account status is restricted', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: { user: restrictedFixture } };
		const next: any = jest.fn();
		await isVerified(req, res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('Rejects if no user', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: {} };
		const next: any = jest.fn();
		await isVerified(req, res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(next).toHaveBeenCalledTimes(1);
	});
});
