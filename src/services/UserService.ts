import { User, AccountStatus, AccountType } from '../entities/User';
import { getConnection } from 'typeorm';
import { hashPassword } from '../util/password';
import { EmailConfirmation } from '../entities/EmailConfirmation';
import { singleton } from 'tsyringe';

export type UserDataToCreate = Omit<User, 'id' | 'accountStatus' | 'accountType'>;

enum EmailVerifyError {
	ConfirmationNotFound = 'Unable to verify your email, the given code was unknown',
	AccountNotUnverified = 'Your account has already been verified'
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

	public async verifyUser(confirmationId: string): Promise<User> {
		return getConnection().transaction(async entityManager => {
			// If an empty string has been passed, .findOne will return any confirmation which is definitely NOT wanted
			if (!confirmationId) {
				throw new Error(EmailVerifyError.ConfirmationNotFound);
			}

			const confirmation = await entityManager.findOne(EmailConfirmation, confirmationId, {
				relations: ['user']
			});

			if (!confirmation) {
				throw new Error(EmailVerifyError.ConfirmationNotFound);
			}

			if (confirmation.user.accountStatus !== AccountStatus.Unverified) {
				throw new Error(EmailVerifyError.AccountNotUnverified);
			}

			confirmation.user.accountStatus = AccountStatus.Verified;
			await entityManager.save(confirmation.user);
			await entityManager.remove(confirmation);
			return confirmation.user;
		});
	}
}
