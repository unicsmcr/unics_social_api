import { User, AccountStatus, AccountType } from '../entities/User';
import { getRepository, getConnection } from 'typeorm';
import { hashPassword } from '../util/password';
import { EmailConfirmation } from '../entities/EmailConfirmation';

type UserDataToCreate = Omit<User, 'id'>;
type UserDataOnlyIdReq = Partial<User> & Required<Pick<User, 'id'>>;

enum EmailVerifyError {
	ConfirmationNotFound = 'Unable to verify your email, the given code was unknown',
	AccountNotUnverified = 'Your account has already been verified'
}

export class UserController {
	public async create(data: UserDataToCreate): Promise<User> {
		const user = new User();
		Object.assign(user, data);
		return getRepository(User).save(user);
	}

	public async update(data: UserDataOnlyIdReq) {
		const userRepo = getRepository(User);
		const user = await userRepo.findOneOrFail(data.id);
		Object.assign(user, data);
		return userRepo.save(user);
	}

	public async registerUser(data: UserDataToCreate): Promise<EmailConfirmation> {
		return getConnection().transaction(async entityManager => {
			const user = new User();
			/*
				to-do:
				- user properties should be validated before committing to database
				- email a manchester student account?
				- password long enough?
				- names are "real"?
			*/
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

	public async verifyUser(confirmationId: string): Promise<void> {
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
		});
	}
}
