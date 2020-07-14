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

		// Verify their email
		const oldUser = { ...confirmation.user };
		const newExpected = {
			...oldUser,
			accountStatus: AccountStatus.Verified
		};
		const user = await userService.verifyUserEmail(confirmation.id);
		expect(user).toMatchObject(newExpected);

		// A second validation attempt should fail
		await expect(userService.verifyUserEmail(confirmation.id)).rejects.toThrow();

		// Attempt 2 invalid authenticates
		await expect(userService.authenticate(fixture.email, 'incorrect')).rejects.toThrow();
		await expect(userService.authenticate(fixture.email, `${fixture.password} `)).rejects.toThrow();

		// Attempt a valid authenticate
		await expect(userService.authenticate(fixture.email, fixture.password)).resolves.toMatchObject(newExpected);
	});

	test('Validate user does not allow empty confirmationId', async () => {
		await expect(userService.verifyUserEmail('')).rejects.toThrow();
	});

	test('Authenticate user does not allow empty confirmationId', async () => {
		await expect(userService.authenticate('', '')).rejects.toThrow();
	});

	test('Authenticate user throws when user not found', async () => {
		await expect(userService.authenticate('fake@email.com', '')).rejects.toThrow();
	});
});
