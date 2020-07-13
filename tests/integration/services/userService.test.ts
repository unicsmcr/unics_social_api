import { UserService } from '../../../src/services/UserService';
import { createDBConnection } from '../../../src';
import { AccountStatus, AccountType } from '../../../src/entities/User';
import '../../util/dbTeardown';

beforeAll(async () => {
	await createDBConnection();
});

const userService = new UserService();

describe('UserService', () => {
	test('Registers valid user and validates email', async () => {
		// Scenario 1

		const fixture = {
			email: 'test@student.manchester.ac.uk',
			password: 'test',
			forename: 'Bob',
			surname: 'Builder'
		};

		// Register a user
		const confirmation = await userService.registerUser(fixture);
		expect(confirmation.id).toBeTruthy();
		expect(confirmation.user).toMatchObject({
			forename: fixture.forename,
			surname: fixture.surname,
			email: fixture.email,
			accountType: AccountType.User,
			accountStatus: AccountStatus.Unverified
		});

		// Attempt 2 invalid validations
		await expect(userService.verifyUserEmail(confirmation.id.substring(0, confirmation.id.length - 1))).rejects.toThrow();
		await expect(userService.verifyUserEmail(`${confirmation.id} `)).rejects.toThrow();

		// Validate their account
		const oldUser = { ...confirmation.user };
		const user = await userService.verifyUserEmail(confirmation.id);
		expect(user).toMatchObject({
			...oldUser,
			accountStatus: AccountStatus.Verified
		});

		// A second validation attempt should fail
		await expect(userService.verifyUserEmail(confirmation.id)).rejects.toThrow();
	});

	test('Validate user does not allow empty confirmationId', async () => {
		await expect(userService.verifyUserEmail('')).rejects.toThrow();
	});
});
