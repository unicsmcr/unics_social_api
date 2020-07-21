import { User, AccountStatus, AccountType } from '../entities/User';
import { getConnection, getRepository, FindConditions, FindOneOptions } from 'typeorm';
import { hashPassword, verifyPassword } from '../util/password';
import { EmailConfirmation } from '../entities/EmailConfirmation';
import { singleton } from 'tsyringe';
import Profile from '../entities/Profile';
import { APIError, formatValidationErrors } from '../util/errors';
import { validateOrReject } from 'class-validator';

export type UserDataToCreate = Omit<User, 'id' | 'accountStatus' | 'accountType' | 'toJSON' | 'toLimitedJSON'>;
export type ProfileDataToCreate = Omit<Profile, 'id' | 'user' | 'toJSON'>;

enum RegistrationError {
	EmailAlreadyExists = 'Email address already registered.',
	MissingInfo = 'Registration data incomplete'
}

enum EmailVerifyError {
	ConfirmationNotFound = 'Unable to verify your email, the given code was unknown'
}

enum AuthenticateError {
	AccountNotFound = 'Account not found.',
	PasswordIncorrect = 'Password incorrect.'
}

enum PutProfileError {
	AccountNotFound = 'Account not found.',
	InvalidEntryDetails = 'Invalid profile details.'
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

	public async registerUser(data: UserDataToCreate): Promise<EmailConfirmation> {
		return getConnection().transaction(async entityManager => {
			const user = new User();

			if (typeof data.password !== 'string' || data.password.length < 10) {
				throw new APIError(400, 'Password must be at least 10 characters long');
			}

			Object.assign(user, {
				...data,
				accountStatus: AccountStatus.Unverified,
				accountType: AccountType.User,
				password: await hashPassword(data.password)
			});

			await validateOrReject(user).catch(e => Promise.reject(formatValidationErrors(e)));

			const emailConfirmation = new EmailConfirmation();
			try {
				emailConfirmation.user = await entityManager.save(user);
			} catch (error) {
				const code = String(error.code);
				if (code === '23505') {
					// 23505 is unique_violation
					throw new APIError(403, RegistrationError.EmailAlreadyExists);
				} else if (code === '23502') {
					// 23502 is not_null_violation
					throw new APIError(400, RegistrationError.MissingInfo);
				}
				throw error;
			}

			return entityManager.save(emailConfirmation);
		});
	}

	public async verifyUserEmail(confirmationId: string): Promise<User> {
		return getConnection().transaction(async entityManager => {
			// If an empty string has been passed, .findOne will return any confirmation which is definitely NOT wanted
			if (!confirmationId) {
				throw new APIError(400, EmailVerifyError.ConfirmationNotFound);
			}

			const confirmation = await entityManager.findOneOrFail(EmailConfirmation, confirmationId)
				.catch(() => Promise.reject(new APIError(400, EmailVerifyError.ConfirmationNotFound)));

			confirmation.user.accountStatus = AccountStatus.Verified;
			await entityManager.save(confirmation.user);
			await entityManager.remove(confirmation);
			return confirmation.user;
		});
	}

	public async authenticate(email: string, password: string): Promise<User> {
		if (!email) {
			throw new APIError(400, AuthenticateError.AccountNotFound);
		}

		const user = await getRepository(User).findOne({ email });
		if (!user) {
			throw new APIError(400, AuthenticateError.AccountNotFound);
		}

		if (!verifyPassword(password, user.password)) {
			throw new APIError(403, AuthenticateError.PasswordIncorrect);
		}

		return user;
	}

	public async putUserProfile(id: string, options: ProfileDataToCreate) {
		return getConnection().transaction(async entityManager => {
			if (!id) throw new APIError(400, PutProfileError.AccountNotFound);
			const user = await entityManager.findOneOrFail(User, { id })
				.catch(() => Promise.reject(new APIError(400, PutProfileError.AccountNotFound)));

			// If a profile doesn't exist, create it
			const profile = user.profile ?? new Profile();
			const { twitter, profilePicture, instagram, yearOfStudy, course, facebook } = options;
			Object.assign(profile, { twitter, profilePicture, instagram, yearOfStudy, course, facebook });
			profile.user = user;
			user.profile = profile;
			return entityManager.save(user).catch(() => Promise.reject(new APIError(400, PutProfileError.InvalidEntryDetails)));
		});
	}
}
