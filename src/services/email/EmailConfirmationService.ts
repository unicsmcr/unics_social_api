import { User, AccountStatus, APIPrivateUser } from '../../entities/User';
import { getConnection } from 'typeorm';
import { singleton } from 'tsyringe';
import { APIError, HttpCode } from '../../util/errors';

export type UserDataToCreate = Pick<User, 'forename' | 'surname' | 'email' | 'password'>;

enum EmailVerifyError {
	UserNotFound = 'User not found',
	AccountNotUnverified = 'Your account has already been verified'
}

@singleton()
export default class UserService {
	public async verifyUserEmail(userID: string): Promise<APIPrivateUser> {
		return getConnection().transaction(async entityManager => {
			if (!userID) throw new APIError(HttpCode.NotFound, EmailVerifyError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, userID).catch(() => Promise.reject(new APIError(HttpCode.NotFound, EmailVerifyError.UserNotFound)));
			if (user.accountStatus !== AccountStatus.Unverified) throw new APIError(HttpCode.BadRequest, EmailVerifyError.AccountNotUnverified);
			user.accountStatus = AccountStatus.Verified;
			await entityManager.save(user);
			return user.toJSONPrivate();
		});
	}
}
