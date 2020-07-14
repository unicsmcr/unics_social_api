import { User, AccountStatus, AccountType } from '../entities/User';
import { getConnection, getRepository } from 'typeorm';
import { hashPassword, verifyPassword } from '../util/password';
import { EmailConfirmation } from '../entities/EmailConfirmation';
import { singleton } from 'tsyringe';

export type UserDataToCreate = Omit<User, 'id' | 'accountStatus' | 'accountType'>;

enum EmailVerifyError {
	ConfirmationNotFound = 'Unable to verify your email, the given code was unknown'
}

enum AuthenticateError {
	AccountNotFound = 'Account not found.',
	PasswordIncorrect = 'Password incorrect.'
}

/*
	to-do:
	improve error handling, use more enums, do not expose raw errors to enduser
*/

@singleton()
export class UserService {
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
}
