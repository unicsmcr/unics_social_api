import { User, AccountStatus, AccountType } from '../entities/User';
import { getRepository, getConnection } from 'typeorm';
import { hashPassword } from '../util/password';
import { EmailConfirmation } from '../entities/EmailConfirmation';

type UserDataToCreate = Omit<User, 'id'>;
type UserDataOnlyIdReq = Partial<User> & Required<Pick<User, 'id'>>;

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
}
