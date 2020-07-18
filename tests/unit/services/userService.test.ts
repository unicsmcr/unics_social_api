import { UserService } from '../../../src/services/UserService';
import { createDBConnection } from '../../../src';
import { AccountStatus, AccountType } from '../../../src/entities/User';
import '../../util/dbTeardown';

beforeAll(async () => {
	await createDBConnection();
});

const userService = new UserService();

describe('UserService', () => {
	test('Extensive user flow through service', async () => {
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
		let user = await userService.verifyUserEmail(confirmation.id);
		expect(user).toMatchObject(newExpected);
		expect(user.profile).toBeNull();

		// A second validation attempt should fail
		await expect(userService.verifyUserEmail(confirmation.id)).rejects.toThrow();

		// Attempt 2 invalid authenticates
		await expect(userService.authenticate(fixture.email, 'incorrect')).rejects.toThrow();
		await expect(userService.authenticate(fixture.email, `${fixture.password} `)).rejects.toThrow();

		// Attempt a valid authenticate
		await expect(userService.authenticate(fixture.email, fixture.password)).resolves.toMatchObject(newExpected);

		// Attempt 2 invalid profile puts
		await expect(userService.putUserProfile(user.id, {} as any)).rejects.toThrow();
		await expect(userService.putUserProfile(user.id, { yearOfStudy: 1.5, course: 'Computer Science', profilePicture: 'asdf' })).rejects.toThrow();

		// Set valid profile
		const profileFixture = {
			yearOfStudy: 1,
			course: 'Computer Science',
			facebook: 'student324'
		};
		user = await userService.putUserProfile(user.id, profileFixture);
		expect(user.profile).toBeTruthy();
		expect(user.profile).toMatchObject(profileFixture);

		// Update profile again
		const profileFixture2 = {
			...profileFixture,
			twitter: 'testacct',
			profilePicture: '5327d0cc39d3047b1d3079fbb02bf11c'
		};
		user = await userService.putUserProfile(user.id, profileFixture2);
		expect(user.profile).toBeTruthy();
		expect(user.profile).toMatchObject({ ...profileFixture2, id: user.profile!.id });

		// Update profile again, but this time try to change the id
		// The service should ignore the id field
		const oldId = user.profile!.id;
		const profileFixture3 = {
			...profileFixture2,
			id: '0a0841a4-6f74-4e3b-85ac-1207727be375'
		};
		user = await userService.putUserProfile(user.id, profileFixture3);
		expect(user.profile).toBeTruthy();
		expect(user.profile).toMatchObject({ ...profileFixture2, id: oldId });
	});

	test('verifyUserEmail does not allow empty confirmationId', async () => {
		await expect(userService.verifyUserEmail('')).rejects.toThrow();
	});

	test('Authenticate user does not allow empty confirmationId', async () => {
		await expect(userService.authenticate('', '')).rejects.toThrow();
	});

	test('Authenticate user throws when user not found', async () => {
		await expect(userService.authenticate('fake@email.com', '')).rejects.toThrow();
	});

	test('User profile update throws when user not found', async () => {
		await expect(userService.putUserProfile('e0377f70-9c59-46a1-a5f2-fc8468ffb5a0', {
			course: 'Computer Science',
			yearOfStudy: 1
		})).rejects.toThrow();
	});

	test('User profile update does not allow empty userId', async () => {
		await expect(userService.putUserProfile('', {
			course: 'History',
			yearOfStudy: 2
		})).rejects.toThrow();
	});
});
