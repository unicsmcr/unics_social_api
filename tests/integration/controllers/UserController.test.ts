import { UserController } from '../../../src/controllers/UserController';
import { createDBConnection } from '../../../src';
import { getConnection } from 'typeorm';
import { AccountStatus, AccountType } from '../../../src/entities/User';

beforeAll(async () => {
	await createDBConnection();
});

afterAll(async () => {
	await getConnection().close();
});

describe('UserController', () => {
	test('Registers valid user and validates email', async () => {
		// Scenario 1
		const userController = new UserController();

		const fixture = {
			email: 'test@student.manchester.ac.uk',
			password: 'test',
			forename: 'Bob',
			surname: 'Builder'
		};

		// Register a user
		const confirmation = await userController.registerUser(fixture);
		expect(confirmation.id).toBeTruthy();
		expect(confirmation.user).toMatchObject({
			forename: fixture.forename,
			surname: fixture.surname,
			email: fixture.email,
			accountType: AccountType.User,
			accountStatus: AccountStatus.Unverified
		});

		// Attempt 2 invalid validations
		await expect(userController.verifyUser(confirmation.id.substring(0, confirmation.id.length - 1))).rejects.toThrow();
		await expect(userController.verifyUser(`${confirmation.id} `)).rejects.toThrow();

		// Validate their account
		const oldUser = { ...confirmation.user };
		const user = await userController.verifyUser(confirmation.id);
		expect(user).toMatchObject({
			...oldUser,
			accountStatus: AccountStatus.Verified
		});

		// A second validation attempt should fail
		await expect(userController.verifyUser(confirmation.id)).rejects.toThrow();
	});
});
