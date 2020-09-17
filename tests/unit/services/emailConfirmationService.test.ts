import EmailConfirmationService from '../../../src/services/email/EmailConfirmationService';
import { createDBConnection } from '../../../src';
import { AccountStatus, User } from '../../../src/entities/User';
import users from '../../fixtures/users';
import * as passwordUtils from '../../../src/util/password';
import { getConnection, getRepository } from 'typeorm';
import { HttpCode } from '../../../src/util/errors';

beforeAll(async () => {
	await createDBConnection();
	const spy = jest.spyOn(passwordUtils, 'hashPassword');
	spy.mockImplementation(password => Promise.resolve(password.split('').reverse().join('')));
});

afterEach(async () => {
	await getConnection().dropDatabase();
	await getConnection().synchronize();
});

const emailConfirmationService = new EmailConfirmationService();

describe(EmailConfirmationService, () => {
	describe('verifyUserEmail', () => {
		const user = users[0];
		beforeEach(async () => {
			await getRepository(User).save(user);
		});

		test('Successfully verifies a user', async () => {
			const verifiedUser = await emailConfirmationService.verifyUserEmail(user.id);
			expect(verifiedUser.accountStatus).toStrictEqual(AccountStatus.Verified);
		});

		test('Fails when trying to verify an already-verified user', async () => {
			const verifiedUser = await emailConfirmationService.verifyUserEmail(user.id);
			expect(verifiedUser.accountStatus).toStrictEqual(AccountStatus.Verified);
			await expect(emailConfirmationService.verifyUserEmail(user.id)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});

		test('Fails with invalid user ID', async () => {
			await expect(emailConfirmationService.verifyUserEmail('')).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
			await expect(emailConfirmationService.verifyUserEmail(`${user.id}123`)).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
		});
	});
});
