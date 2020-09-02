import { UserService } from '../../../src/services/UserService';
import { createDBConnection } from '../../../src';
import { AccountStatus, AccountType, User } from '../../../src/entities/User';
import users from '../../fixtures/users';
import * as passwordUtils from '../../../src/util/password';
import { getConnection, getRepository } from 'typeorm';
import { APIProfile } from '../../../src/entities/Profile';
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

const userService = new UserService();

describe('UserService', () => {
	describe('registerUser', () => {
		test('Registers a user with valid details', async () => {
			const { email, forename, surname } = users[0];
			const details = { email, forename, surname, password: 'thunderbolt' };
			const user = await userService.registerUser(details);
			expect(user.id).toBeTruthy();
			expect(user).toMatchObject({
				email,
				forename,
				surname,
				accountType: AccountType.User,
				accountStatus: AccountStatus.Unverified
			});
			expect(user.password).toStrictEqual('tlobrednuht');
			// 2nd registration should fail
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});

		test('Accepts Postgrad Email', async () => {
			const { email, surname, forename } = users[1];
			const details = { email, forename, surname, password: 'thunderbolt' };
			const user = await userService.registerUser(details);
			expect(user).toMatchObject({
				email,
				forename,
				surname,
				accountType: AccountType.User,
				accountStatus: AccountStatus.Unverified
			});
		});

		test('Fails with invalid email', async () => {
			const { forename, surname } = users[0];
			const details = { email: 'not-a-student@gmail.com', forename, surname, password: 'thunderbolt' };
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Fails with missing password', async () => {
			const { email, forename, surname } = users[0];
			const details = { email, forename, surname, password: '' };
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Fails with short password (6 characters)', async () => {
			const { email, forename, surname } = users[0];
			const details = { email, forename, surname, password: '123456' };
			await expect(userService.registerUser(details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Fails with very long forename/surname (41 chars)', async () => {
			const { email, forename, surname } = users[0];
			await expect(userService.registerUser({ email, forename: 'f'.repeat(41), surname, password: 'thunderbolt' })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
			await expect(userService.registerUser({ email, forename, surname: 'h'.repeat(41), password: 'thunderbolt' })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});

		test('Success for valid forename/surname (20 chars)', async () => {
			const { email, surname } = users[0];
			const forename = 'f'.repeat(20);
			const details = { email, forename, surname, password: 'thunderbolt' };
			const user = await userService.registerUser(details);
			expect(user).toMatchObject({
				email,
				forename,
				surname,
				accountType: AccountType.User,
				accountStatus: AccountStatus.Unverified
			});
		});

		test('Fails with no forename/surname (0 chars)', async () => {
			const { email, forename, surname } = users[0];
			await expect(userService.registerUser({ email, forename: '', surname, password: 'thunderbolt' })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
			await expect(userService.registerUser({ email, forename, surname: '', password: 'thunderbolt' })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(User).findOneOrFail()).rejects.toThrow();
		});
	});

	describe('verifyUserEmail', () => {
		const user = users[0];
		beforeEach(async () => {
			await getRepository(User).save(user);
		});

		test('Successfully verifies a user', async () => {
			const verifiedUser = await userService.verifyUserEmail(user.id);
			expect(verifiedUser.accountStatus).toStrictEqual(AccountStatus.Verified);
		});

		test('Fails when trying to verify an already-verified user', async () => {
			const verifiedUser = await userService.verifyUserEmail(user.id);
			expect(verifiedUser.accountStatus).toStrictEqual(AccountStatus.Verified);
			await expect(userService.verifyUserEmail(user.id)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});

		test('Fails with invalid user ID', async () => {
			await expect(userService.verifyUserEmail('')).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
			await expect(userService.verifyUserEmail(`${user.id}123`)).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
		});
	});

	describe('authenticate', () => {
		const user = users[0];

		beforeEach(async () => {
			await getRepository(User).save(user);
		});

		test('Authenticates a user with the correct password', async () => {
			const resolvedUser = await userService.authenticate(user.email, 'thunderbolt');
			expect(resolvedUser).toMatchObject(user.toJSONPrivate());
		});

		test('Authenticate fails with empty/invalid email', async () => {
			await expect(userService.authenticate('', 'thunderbolt')).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(userService.authenticate('random@student.manchester.ac.uk', 'thunderbolt')).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});

		test('Authenticate fails with invalid password', async () => {
			await expect(userService.authenticate(user.email, '')).rejects.toMatchObject({ httpCode: HttpCode.Forbidden });
			await expect(userService.authenticate(user.email, 'password')).rejects.toMatchObject({ httpCode: HttpCode.Forbidden });
			await expect(userService.authenticate(user.email, 'thunderbolt ')).rejects.toMatchObject({ httpCode: HttpCode.Forbidden });
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
				yearOfStudy: 1,
				avatar: false,
				instagram:'',
				facebook:'',
				twitter:''
			});
			expect({ ...savedUser, profile: undefined }).toMatchObject(userWithoutProfile.toJSONPrivate());
			const nonNullishProperties = [...Object.keys(savedUser.profile!)].filter(prop => savedUser.profile![prop as keyof APIProfile]);
			expect(nonNullishProperties).toEqual(expect.arrayContaining(['id', 'course', 'yearOfStudy']));
			expect(savedUser.profile!.course).toStrictEqual('Computer Science');
			expect(savedUser.profile!.yearOfStudy).toStrictEqual(1);
		});

		test('User profile registered for valid request (existing profile)', async () => {
			const initialProfile = userWithProfile.profile;
			const savedUser = await userService.putUserProfile(userWithProfile.id, {
				course: 'Software Engineering',
				yearOfStudy: 2,
				avatar: false
			});
			expect(userWithProfile).toMatchObject({ ...savedUser, profile: userWithProfile.profile });
			const nonNullishProperties = [...Object.keys(savedUser.profile!)].filter(prop => savedUser.profile![prop as keyof APIProfile]);
			expect(nonNullishProperties).toEqual(expect.arrayContaining(['id', 'course', 'yearOfStudy']));
			expect(initialProfile).not.toMatchObject(savedUser.profile!);
			expect(savedUser.profile!.course).toStrictEqual('Software Engineering');
			expect(savedUser.profile!.yearOfStudy).toStrictEqual(2);
		});

		test('Fails to create user profile for non-existent user', async () => {
			const details = { course: 'Computer Science', yearOfStudy: 1, avatar: false };
			await expect(userService.putUserProfile('', details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(userService.putUserProfile(`${userWithProfile.id}1`, details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(userService.putUserProfile(`${userWithoutProfile.id}a`, details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});

		test('Fails to create user profile with invalid details', async () => {
			await expect(userService.putUserProfile(userWithoutProfile.id, {} as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(userService.putUserProfile(userWithoutProfile.id, { course: 'History', yearOfStudy: 1 } as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(userService.putUserProfile(userWithoutProfile.id, { course: 'Computer Science', yearOfStudy: 2.5 } as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});
	});
});
