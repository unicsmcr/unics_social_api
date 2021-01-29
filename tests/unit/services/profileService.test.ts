import { ProfileService } from '../../../src/services/ProfileService';
import { createDBConnection } from '../../../src';
import { User } from '../../../src/entities/User';
import users from '../../fixtures/users';
import * as passwordUtils from '../../../src/util/password';
import { getConnection, getRepository } from 'typeorm';
import { APIProfile, Year, Visibility } from '../../../src/entities/Profile';
import { HttpCode } from '../../../src/util/errors';

enum Course {
	COMPUTER_SCIENCE = 'Computer Science',
	ARTIFICIAL_INTELLIGENCE = 'Artificial Intelligence',
	SOFTWARE_ENGINEERING = 'Software Engineering'
}

beforeAll(async () => {
	await createDBConnection();
	const spy = jest.spyOn(passwordUtils, 'hashPassword');
	spy.mockImplementation(password => Promise.resolve(password.split('').reverse().join('')));
});

afterEach(async () => {
	await getConnection().dropDatabase();
	await getConnection().synchronize();
});

const profileService = new ProfileService();

describe('ProfileService', () => {
	describe('putUserProfile', () => {
		const userWithoutProfile = users.find(user => !user.profile)!;
		const userWithProfile = users.find(user => user.profile)!;
		beforeEach(async () => {
			await getRepository(User).save([userWithProfile, userWithoutProfile]);
		});

		test('User profile registered for valid request (new profile)', async () => {
			const savedUser = await profileService.putUserProfile(userWithoutProfile.id, {
				course: Course.COMPUTER_SCIENCE,
				yearOfStudy: Year.TWO,
				avatar: false,
				instagram: '',
				facebook: '',
				twitter: '',
				linkedin: '',
				visibility: Visibility.Public
			});
			expect({ ...savedUser, profile: undefined }).toMatchObject(userWithoutProfile.toJSONPrivate());
			const nonNullishProperties = [...Object.keys(savedUser.profile!)].filter(prop => savedUser.profile![prop as keyof APIProfile]);
			expect(nonNullishProperties).toEqual(expect.arrayContaining(['id', 'course', 'yearOfStudy']));
			expect(savedUser.profile!.course).toStrictEqual(Course.COMPUTER_SCIENCE);
			expect(savedUser.profile!.yearOfStudy).toStrictEqual(Year.TWO);
		});

		test('User profile registered for valid request (existing profile)', async () => {
			const initialProfile = userWithProfile.profile;
			const savedUser = await profileService.putUserProfile(userWithProfile.id, {
				course: Course.SOFTWARE_ENGINEERING,
				yearOfStudy: Year.ONE,
				avatar: false,
				visibility: Visibility.Public
			});
			expect({ ...userWithProfile, discord: false }).toMatchObject({ ...savedUser, profile: userWithProfile.profile });
			const nonNullishProperties = [...Object.keys(savedUser.profile!)].filter(prop => savedUser.profile![prop as keyof APIProfile]);
			expect(nonNullishProperties).toEqual(expect.arrayContaining(['id', 'course', 'yearOfStudy']));
			expect(initialProfile).not.toMatchObject(savedUser.profile!);
			expect(savedUser.profile!.course).toStrictEqual(Course.SOFTWARE_ENGINEERING);
			expect(savedUser.profile!.yearOfStudy).toStrictEqual(Year.ONE);
		});

		test('Fails to create user profile for non-existent user', async () => {
			const details = { course: Course.COMPUTER_SCIENCE, yearOfStudy: Year.TWO, avatar: false, visibility: Visibility.Public };
			await expect(profileService.putUserProfile('', details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(profileService.putUserProfile(`${userWithProfile.id}1`, details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(profileService.putUserProfile(`${userWithoutProfile.id}a`, details)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});

		test('Fails to create user profile with invalid details', async () => {
			await expect(profileService.putUserProfile(userWithoutProfile.id, {} as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(profileService.putUserProfile(userWithoutProfile.id, { course: 'FakeNews', yearOfStudy: Year.ONE } as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(profileService.putUserProfile(userWithoutProfile.id, { course: 'Software Engineering', yearOfStudy: 'Tenth Year' } as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(profileService.putUserProfile(userWithoutProfile.id, { course: 'Computer Science', yearOfStudy: 3 } as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});
	});
});
