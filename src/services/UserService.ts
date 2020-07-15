import { User, AccountStatus, AccountType } from '../entities/User';
import { getConnection, getRepository, FindConditions, FindOneOptions } from 'typeorm';
import { hashPassword, verifyPassword } from '../util/password';
import { EmailConfirmation } from '../entities/EmailConfirmation';
import { singleton } from 'tsyringe';
import Profile from '../entities/Profile';

export type UserDataToCreate = Omit<User, 'id' | 'accountStatus' | 'accountType' | 'toJSON'>;
export type ProfileDataToCreate = Omit<Profile, 'id' | 'user' | 'toJSON'>;

enum EmailVerifyError {
	ConfirmationNotFound = 'Unable to verify your email, the given code was unknown'
}

enum AuthenticateError {
	AccountNotFound = 'Account not found.',
	PasswordIncorrect = 'Password incorrect.'
}

enum PutProfileError {
	AccountNotFound = 'Account not found.'
}

/*
	to-do:
	improve error handling, use more enums, do not expose raw errors to enduser
*/

@singleton()
export class UserService {
	public async findOne(findConditions: FindConditions<User>, options?: FindOneOptions) {
		return getRepository(User).findOne(findConditions, options);
	}

	public async findOneOrFail(findConditions: FindConditions<User>, options?: FindOneOptions) {
		return getRepository(User).findOneOrFail(findConditions, options);
	}

	public async registerUser(data: UserDataToCreate): Promise<EmailConfirmation> {
		return getConnection().transaction(async entityManager => {
			const user = new User();

			Object.assign(user, {
				...data,
				accountStatus: AccountStatus.Unverified,
				accountType: AccountType.User,
				password: await hashPassword(data.password)
			});

			const emailConfirmation = new EmailConfirmation();
			emailConfirmation.user = await entityManager.save(user);

			return entityManager.save(emailConfirmation);
		});
	}

	public async verifyUserEmail(confirmationId: string): Promise<User> {
		return getConnection().transaction(async entityManager => {
			// If an empty string has been passed, .findOne will return any confirmation which is definitely NOT wanted
			if (!confirmationId) {
				throw new Error(EmailVerifyError.ConfirmationNotFound);
			}

			const confirmation = await entityManager.findOne(EmailConfirmation, confirmationId);

			if (!confirmation) {
				throw new Error(EmailVerifyError.ConfirmationNotFound);
			}

			confirmation.user.accountStatus = AccountStatus.Verified;
			await entityManager.save(confirmation.user);
			await entityManager.remove(confirmation);
			return confirmation.user;
		});
	}

	public async authenticate(email: string, password: string): Promise<User> {
		if (!email) {
			throw new Error(AuthenticateError.AccountNotFound);
		}

		const user = await getRepository(User).findOne({ email });
		if (!user) {
			throw new Error(AuthenticateError.AccountNotFound);
		}

		if (!verifyPassword(password, user.password)) {
			throw new Error(AuthenticateError.PasswordIncorrect);
		}

		return user;
	}

	public async putUserProfile(id: string, options: ProfileDataToCreate) {
		return getConnection().transaction(async entityManager => {
			if (!id) throw new Error(PutProfileError.AccountNotFound);
			const user = await entityManager.findOne(User, { id });
			if (!user) throw new Error(PutProfileError.AccountNotFound);

			// If a profile doesn't exist, create it
			const profile = user.profile ?? new Profile();
			const { twitter, profilePicture, instagram, yearOfStudy, course, facebook } = options;
			Object.assign(profile, { twitter, profilePicture, instagram, yearOfStudy, course, facebook });
			profile.user = user;
			user.profile = profile;
			return entityManager.save(user);
		});
	}
}
