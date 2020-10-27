import { User, AccountStatus, AccountType, APIPrivateUser, APIUser } from '../entities/User';
import { getConnection, getRepository, FindConditions, FindOneOptions } from 'typeorm';
import { hashPassword, verifyPassword } from '../util/password';
import { singleton } from 'tsyringe';
import Profile, { Visibility } from '../entities/Profile';
import { APIError, formatValidationErrors, HttpCode } from '../util/errors';
import { validateOrReject } from 'class-validator';
import Report from '../entities/Report';
import { sanitiseHTML } from '../util/sanitise';

export type UserDataToCreate = Pick<User, 'forename' | 'surname' | 'email' | 'password'>;
export interface PasswordResetData { password: string }
export type ProfileDataToCreate = Omit<Profile, 'id' | 'user' | 'toJSON' | 'avatar'> & { avatar: string | boolean };
export type ReportDataToCreate = Pick<Report, 'description'>;

enum RegistrationError {
	EmailAlreadyExists = 'Email address already registered.',
	MissingInfo = 'Registration data incomplete'
}

enum EmailVerifyError {
	UserNotFound = 'User not found',
	AccountNotUnverified = 'Your account has already been verified'
}

enum ForgotPasswordError {
	UserNotFound = 'User not found',
	AccountUnverified = 'Your account has not been verified yet'
}

enum ResetPasswordError {
	UserNotFound = 'User not found',
	NewPasswordRequired = 'You should provide a new password',
	InvalidEntryDetails = 'Invalid user details.'
}

enum AuthenticateError {
	InvalidCredentials = 'Invalid Credentials',
	AccountUnverified = 'Your account has not been verified yet'
}

enum ReportUserError {
	UserNotFound = 'User not found',
	InvalidEntryDetails = 'Invalid user details.'
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

	public async registerUser(data: UserDataToCreate): Promise<User> {
		return getConnection().transaction(async entityManager => {
			const user = new User();

			if (typeof data.password !== 'string' || data.password.length < 10) {
				throw new APIError(HttpCode.BadRequest, 'Password must be at least 10 characters long');
			}

			Object.assign(user, {
				...data,
				email: data.email.toLowerCase(),
				accountStatus: AccountStatus.Unverified,
				accountType: AccountType.User,
				password: await hashPassword(data.password)
			});

			await validateOrReject(user).catch(e => Promise.reject(formatValidationErrors(e)));

			try {
				return await entityManager.save(user);
			} catch (error) {
				const code = String(error.code);
				if (code === '23505') {
					// 23505 is unique_violation
					throw new APIError(HttpCode.BadRequest, RegistrationError.EmailAlreadyExists);
				} else if (code === '23502') {
					// 23502 is not_null_violation
					throw new APIError(HttpCode.BadRequest, RegistrationError.MissingInfo);
				}
				throw error;
			}
		});
	}

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

	public async getUserByEmail(email: string): Promise<APIPrivateUser> {
		if (!email) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}
		const user = await getRepository(User)
			.createQueryBuilder('user').where('user.email = LOWER(:email)', { email })
			.getOne();

		if (!user) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}
		if (user.accountStatus !== AccountStatus.Unverified) throw new APIError(HttpCode.BadRequest, EmailVerifyError.AccountNotUnverified);

		return user.toJSONPrivate();
	}

	public async authenticate(email: string, password: string): Promise<APIPrivateUser> {
		if (!email) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}

		const user = await getRepository(User)
			.createQueryBuilder('user').where('user.email = LOWER(:email)', { email })
			.addSelect('user.password')
			.getOne();

		if (!user) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}


		if (!verifyPassword(password, user.password)) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}

		if (user.accountStatus === AccountStatus.Unverified) {
			throw new APIError(HttpCode.Unauthorized, AuthenticateError.AccountUnverified);
		}

		return user.toJSONPrivate();
	}

	public async findAllPublic(): Promise<APIUser[]> {
		const users = await getRepository(User)
			.createQueryBuilder('user')
			.select(['user', 'profile'])
			.leftJoin('user.profile', 'profile')
			.where('profile.visibility = :status', { status: Visibility.Public })
			.getMany();
		return users.map(user => user.toJSON());
	}

	public async forgotPassword(userEmail: string): Promise<APIPrivateUser> {
		return getConnection().transaction(async entityManager => {
			if (!userEmail) throw new APIError(HttpCode.Forbidden, ForgotPasswordError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, { email: userEmail.toLowerCase() }).catch(() => Promise.reject(new APIError(HttpCode.NotFound, ForgotPasswordError.UserNotFound)));
			if (user.accountStatus === AccountStatus.Unverified) throw new APIError(HttpCode.Forbidden, ForgotPasswordError.AccountUnverified);
			return user.toJSONPrivate();
		});
	}

	public async resetPassword(userID: string, data: PasswordResetData): Promise<User> {
		return getConnection().transaction(async entityManager => {
			if (!data.password) {
				throw new APIError(HttpCode.BadRequest, ResetPasswordError.NewPasswordRequired);
			}
			if (!userID) throw new APIError(HttpCode.NotFound, ResetPasswordError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, { id: userID }).catch(() => Promise.reject(new APIError(HttpCode.NotFound, ResetPasswordError.UserNotFound)));
			if (typeof data.password !== 'string' || data.password.length < 10) {
				throw new APIError(HttpCode.BadRequest, 'Password must be at least 10 characters long');
			}
			Object.assign(user, {
				password: await hashPassword(data.password)
			});
			await validateOrReject(user).catch(e => Promise.reject(formatValidationErrors(e)));
			const savedUser = await entityManager.save(user).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, ResetPasswordError.InvalidEntryDetails)));
			return savedUser;
		});
	}

	public async reportUser(reportingID: string, reportedID: string, options: ReportDataToCreate) {
		return getConnection().transaction(async entityManager => {
			if (!reportingID) throw new APIError(HttpCode.NotFound, ReportUserError.UserNotFound);
			if (!reportedID) throw new APIError(HttpCode.NotFound, ReportUserError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, { id: reportedID })
				.catch(() => Promise.reject(new APIError(HttpCode.NotFound, ReportUserError.UserNotFound)));

			const report = new Report();
			const { description } = options;
			if (!description || typeof description !== 'string') throw new APIError(HttpCode.BadRequest, ReportUserError.InvalidEntryDetails);
			Object.assign(report, { currentTime: new Date(), description: sanitiseHTML(description) });
			report.reportedUser = user;
			report.reportingUser = await entityManager.findOneOrFail(User, { id: reportingID });
			await validateOrReject(report).catch(e => Promise.reject(formatValidationErrors(e)));
			await entityManager.save(report).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, ReportUserError.InvalidEntryDetails)));
			return report.toJSON();
		});
	}
}
