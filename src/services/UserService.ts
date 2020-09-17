import { User, AccountStatus, AccountType, APIPrivateUser } from '../entities/User';
import { getConnection, getRepository, FindConditions, FindOneOptions } from 'typeorm';
import { hashPassword, verifyPassword } from '../util/password';
import { singleton } from 'tsyringe';
import Profile from '../entities/Profile';
import { APIError, formatValidationErrors, HttpCode } from '../util/errors';
import { validateOrReject } from 'class-validator';
import { writeFile as _writeFile, unlink as _unlink } from 'fs';
import { promisify } from 'util';
import sharp from 'sharp';
import { TokenType } from '../util/auth';
import Report from '../entities/Report';

const writeFile = promisify(_writeFile);
const unlink = promisify(_unlink);


export type UserDataToCreate = Pick<User, 'forename' | 'surname' | 'email' | 'password'>;
export interface PasswordResetDataToCreate {password: string; currentpassword?: string}
export type ProfileDataToCreate = Omit<Profile, 'id' | 'user' | 'toJSON' | 'avatar'> & { avatar: string|boolean };
export type ReportDataToCreate = Pick<Report, 'description' >;

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
	CurrentPasswordRequired = 'YYou should provide your current password',
	InvalidCredentials = 'Invalid Credentials'
}

enum AuthenticateError {
	InvalidCredentials = 'Invalid Credentials'
}

enum ReporttUserError {
	UserNotFound = 'User not found',
	InvalidEntryDetails = 'Invalid user details.'
}

enum PutProfileError {
	AccountNotFound = 'Account not found.',
	InvalidEntryDetails = 'Invalid profile details.',
	InvalidAvatar = 'Avatar must be an image.'
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

	public async authenticate(email: string, password: string): Promise<APIPrivateUser> {
		if (!email) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}

		const user = await getRepository(User)
			.createQueryBuilder('user').where('user.email= :email', { email })
			.addSelect('user.password')
			.getOne();

		if (!user) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}

		if (!verifyPassword(password, user.password)) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.InvalidCredentials);
		}

		return user.toJSONPrivate();
	}

	public async forgotPassword(userEmail: string): Promise<APIPrivateUser> {
		return getConnection().transaction(async entityManager => {
			if (!userEmail) throw new APIError(HttpCode.NotFound, ForgotPasswordError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, userEmail).catch(() => Promise.reject(new APIError(HttpCode.NotFound, ForgotPasswordError.UserNotFound)));
			if (user.accountStatus === AccountStatus.Unverified) throw new APIError(HttpCode.BadRequest, ForgotPasswordError.AccountUnverified);
			return user.toJSONPrivate();
		});
	}

	public async resetPassword(tokenType: TokenType, userID: string, data: PasswordResetDataToCreate): Promise<APIPrivateUser> {
		return getConnection().transaction(async entityManager => {
			if (!userID) throw new APIError(HttpCode.NotFound, ResetPasswordError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, userID).catch(() => Promise.reject(new APIError(HttpCode.NotFound, ResetPasswordError.UserNotFound)));
			if (tokenType === TokenType.Auth) {
				if (!data.currentpassword) throw new APIError(HttpCode.BadRequest, ResetPasswordError.CurrentPasswordRequired);
				if (!verifyPassword(data.currentpassword, user.password)) {
					throw new APIError(HttpCode.Forbidden, ResetPasswordError.InvalidCredentials);
				}
			}
			Object.assign(user, {
				password: await hashPassword(data.password)
			});
			return user.toJSONPrivate();
		});
	}

	public async reportUser(reportingID: string, reportedID: string, options: ReportDataToCreate) {
		return getConnection().transaction(async entityManager => {
			if (!reportingID) throw new APIError(HttpCode.NotFound, ReporttUserError.UserNotFound);
			if (!reportedID) throw new APIError(HttpCode.NotFound, ReporttUserError.UserNotFound);
			const user = await entityManager.findOneOrFail(User, { id: reportedID })
				.catch(() => Promise.reject(new APIError(HttpCode.NotFound, ReporttUserError.UserNotFound)));

			const report = new Report();
			const { description } = options;
			Object.assign(report, { currentTime: new Date(), description });
			report.reportedUser = user;
			report.reportingUser = await entityManager.findOneOrFail(User, { id: reportingID });
			await validateOrReject(report).catch(e => Promise.reject(formatValidationErrors(e)));
			await entityManager.save(report).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, ReporttUserError.InvalidEntryDetails)));
			return report.toJSON();
		});
	}


	public async putUserProfile(id: string, options: ProfileDataToCreate, file?: Express.Multer.File) {
		return getConnection().transaction(async entityManager => {
			if (!id) throw new APIError(HttpCode.BadRequest, PutProfileError.AccountNotFound);
			const user = await entityManager.findOneOrFail(User, { id })
				.catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PutProfileError.AccountNotFound)));


			// If a profile doesn't exist, create it
			const profile = user.profile ?? new Profile();
			const { twitter, instagram, yearOfStudy, course, facebook, linkedin } = options;
			Object.assign(profile, { twitter, instagram, yearOfStudy, course, facebook, linkedin });
			profile.user = user;
			user.profile = profile;

			const unsetAvatar = typeof options.avatar === 'boolean' ? !options.avatar : options.avatar === 'false';

			// If there is an avatar, try to process it
			let processedAvatar: Buffer|undefined;
			if (!unsetAvatar && file?.buffer && file.buffer.length > 0) {
				processedAvatar = await sharp(file.buffer)
					.resize({ width: 150, height: 150, fit: sharp.fit.contain })
					.png()
					.toBuffer()
					.catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PutProfileError.InvalidAvatar)));
				profile.avatar = true;
			} else if (unsetAvatar) {
				await unlink(`./assets/${user.id}.png`).catch(() => Promise.resolve());
				profile.avatar = false;
			}

			await validateOrReject(profile).catch(e => Promise.reject(formatValidationErrors(e)));
			const savedUser = await entityManager.save(user).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PutProfileError.InvalidEntryDetails)));
			if (processedAvatar) {
				await writeFile(`./assets/${user.id}.png`, processedAvatar);
			}
			return savedUser.toJSONPrivate();
		});
	}
}
