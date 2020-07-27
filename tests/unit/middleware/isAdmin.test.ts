import 'reflect-metadata';

import isVerified from '../../../src/routes/middleware/isVerified';
import { AccountType } from '../../../src/entities/User';
import users from '../../fixtures/users';

const normalFixture = users.find(user => user.accountType !== AccountType.Admin)!;
const adminFixture = users.find(user => user.accountType === AccountType.Admin)!;

describe('isAdmin middleware', () => {
	test('Resolves if account type is admin', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: { user: adminFixture } };
		const next: any = jest.fn();
		await isVerified(req, res, next);
		expect(next).toHaveBeenCalledWith();
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('Rejects if account type is not admin', async () => {
		const req: any = { headers: {} };
		const res: any = { locals: { user: normalFixture } };
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
