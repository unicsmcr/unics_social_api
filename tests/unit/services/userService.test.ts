import { UserService } from '../../../src/services/UserService';
import { createDBConnection } from '../../../src';
import { AccountStatus, AccountType, User } from '../../../src/entities/User';
import '../../util/dbTeardown';
import users from '../../fixtures/users';
import * as passwordUtils from '../../../src/util/password';
import { getConnection, getRepository } from 'typeorm';
import { EmailConfirmation } from '../../../src/entities/EmailConfirmation';
import Profile from '../../../src/entities/Profile';
import { HttpResponseCode } from '../../../src/util/errors';

beforeAll(async () => {
	await createDBConnection();
});

afterEach(async () => {
	await getConnection().dropDatabase();
	await getConnection().synchronize();
});

const userService = new UserService();

describe('UserService', () => {
	describe('registerUser', () => {
		test('Registers a user with valid details', async () => {
			// Mock
			const spy = jest.spyOn(passwordUtils, 'hashPassword');
			spy.mockImplementation(() => Promise.resolve('passwordhash'));

			const { email, forename, surname } = users[0];
			const details = { email, forename, surname, password: 'thunderbolt' };
			const confirmation = await userService.registerUser(details);
			expect(confirmation.id).toBeTruthy();
			expect(confirmation.user).toMatchObject({
				email,
				forename,
				surname,
				accountType: AccountType.User,
				accountStatus: AccountStatus.Unverified
			});
			expect(confirmation.user.password).toStrictEqual('passwordhash');
			// 2nd registration should fail
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			spy.mockReset();
		});

		test('Fails with invalid email', async () => {
			const { forename, surname } = users[0];
			const details = { email: 'not-a-student@gmail.com', forename, surname, password: 'thunderbolt' };
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Fails with missing password', async () => {
			const { email, forename, surname } = users[0];
			const details = { email, forename, surname, password: '' };
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Fails with short password (6 characters)', async () => {
			const { email, forename, surname } = users[0];
			const details = { email, forename, surname, password: '123456' };
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Fails with very long forename/surname (50 chars)', async () => {
			const { email, forename, surname } = users[0];
			await expect(userService.registerUser({ email, forename: 'f'.repeat(50), surname, password: 'thunderbolt' })).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
			await expect(userService.registerUser({ email, forename, surname: 'h'.repeat(50), password: 'thunderbolt' })).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});
	});

	describe('verifyUserEmail', () => {
		let confirmation: EmailConfirmation;
		const user = users[0];
		beforeEach(async () => {
			confirmation = new EmailConfirmation();
			confirmation.id = '86e194ae-31c8-462b-894e-c1cca689837a';
			confirmation.user = user;
			await getRepository(User).save(user);
			await getRepository(EmailConfirmation).save(confirmation);
		});

		test('Successfully verifies a user email with a valid confirmation', async () => {
			const user = await userService.verifyUserEmail(confirmation.id);
			expect(user).toMatchObject({
				...user,
				accountStatus: AccountStatus.Verified
			});

			// Second validation should fail
			await expect(userService.verifyUserEmail(confirmation.id)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
		});

		test('Fails with invalid confirmation id', async () => {
			await expect(userService.verifyUserEmail('')).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.verifyUserEmail(user.id)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.verifyUserEmail(`${confirmation.id} `)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
		});
	});

	describe('authenticate', () => {
		const user = users[0];

		beforeEach(async () => {
			await getRepository(User).save(user);
		});

		test('Authenticates a user with the correct password', async () => {
			const resolvedUser = await userService.authenticate(user.email, 'thunderbolt');
			expect(resolvedUser).toMatchObject(user);
		});

		test('Authenticate fails with empty/invalid email', async () => {
			await expect(userService.authenticate('', 'thunderbolt')).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.authenticate('random@student.manchester.ac.uk', 'thunderbolt')).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
		});

		test('Authenticate fails with invalid password', async () => {
			await expect(userService.authenticate(user.email, '')).rejects.toMatchObject({ httpCode: HttpResponseCode.Forbidden });
			await expect(userService.authenticate(user.email, 'password')).rejects.toMatchObject({ httpCode: HttpResponseCode.Forbidden });
			await expect(userService.authenticate(user.email, 'thunderbolt ')).rejects.toMatchObject({ httpCode: HttpResponseCode.Forbidden });
		});
	});

	describe('putUserProfile', () => {
		const userWithoutProfile = users.find(user => !user.profile)!;
		const userWithProfile = users.find(user => user.profile)!;
		beforeEach(async () => {
			await getRepository(User).save([userWithProfile, userWithoutProfile]);
		});

		test('User profile registered for valid request (new profile)', async () => {
			const savedUser = await userService.putUserProfile(userWithoutProfile.id, {
				course: 'Computer Science',
				yearOfStudy: 1
			});
			expect(savedUser).toMatchObject(userWithoutProfile);
			const nonNullishProperties = [...Object.keys(savedUser.profile!)].filter(prop => savedUser.profile![prop as keyof Profile]);
			expect(nonNullishProperties).toEqual(expect.arrayContaining(['id', 'course', 'yearOfStudy', 'user']));
			expect(savedUser.profile!.course).toStrictEqual('Computer Science');
			expect(savedUser.profile!.yearOfStudy).toStrictEqual(1);
		});

		test('User profile registered for valid request (existing profile)', async () => {
			const initialProfile = userWithProfile.profile;
			const savedUser = await userService.putUserProfile(userWithProfile.id, {
				course: 'Software Engineering',
				yearOfStudy: 2
			});
			expect(userWithProfile).toMatchObject({ ...savedUser, profile: userWithProfile.profile });
			const nonNullishProperties = [...Object.keys(savedUser.profile!)].filter(prop => savedUser.profile![prop as keyof Profile]);
			expect(nonNullishProperties).toEqual(expect.arrayContaining(['id', 'course', 'yearOfStudy', 'user']));
			expect(initialProfile).not.toMatchObject(savedUser.profile!);
			expect(savedUser.profile!.course).toStrictEqual('Software Engineering');
			expect(savedUser.profile!.yearOfStudy).toStrictEqual(2);
		});

		test('Fails to create user profile for non-existent user', async () => {
			const details = { course: 'Computer Science', yearOfStudy: 1 };
			await expect(userService.putUserProfile('', details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.putUserProfile(`${userWithProfile.id}1`, details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.putUserProfile(`${userWithoutProfile.id}a`, details)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
		});

		test('Fails to create user profile with invalid details', async () => {
			await expect(userService.putUserProfile(userWithoutProfile.id, {} as any)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.putUserProfile(userWithoutProfile.id, { course: 'History' } as any)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.putUserProfile(userWithoutProfile.id, { yearOfStudy: 2 } as any)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
			await expect(userService.putUserProfile(userWithoutProfile.id, { course: 'Computer Science', yearOfStudy: 2.5 } as any)).rejects.toMatchObject({ httpCode: HttpResponseCode.BadRequest });
		});
	});
});
