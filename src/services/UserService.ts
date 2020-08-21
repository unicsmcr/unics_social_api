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
import { verifyJWT } from '../util/auth';

const writeFile = promisify(_writeFile);
const unlink = promisify(_unlink);

export type UserDataToCreate = Pick<User, 'forename' | 'surname' | 'email' | 'password'>;
export type ProfileDataToCreate = Omit<Profile, 'id' | 'user' | 'toJSON' | 'avatar'> & { avatar: string|boolean };

enum RegistrationError {
	EmailAlreadyExists = 'Email address already registered.',
	MissingInfo = 'Registration data incomplete'
}

enum EmailVerifyError {
	ConfirmationNotFound = 'Unable to verify your email, the given code was unknown',
	TokenNotFound = 'Unable to find JWT token'
}

enum AuthenticateError {
	AccountNotFound = 'Account not found.',
	PasswordIncorrect = 'Password incorrect.'
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

			return entityManager.save(user);
		});
	}

	public async verifyUserEmail(jwt: string): Promise<APIPrivateUser> {
		return getConnection().transaction(async entityManager => {
			if (!jwt) {
				throw new APIError(HttpCode.BadRequest, EmailVerifyError.TokenNotFound);
			}

			const jwtToken = await verifyJWT(jwt);
			if (!jwtToken) {
				throw new APIError(HttpCode.BadRequest, EmailVerifyError.TokenNotFound);
			}
			const user = await entityManager.findOneOrFail(User, jwtToken.id).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, EmailVerifyError.ConfirmationNotFound)));
			user.accountStatus = AccountStatus.Verified;
			await entityManager.save(user);
			return user.toJSONPrivate();
		});
	}

	public async authenticate(email: string, password: string): Promise<APIPrivateUser> {
		if (!email) {
			throw new APIError(HttpCode.BadRequest, AuthenticateError.AccountNotFound);
		}

		const user = await getRepository(User).findOne({ email });
		if (!user) {
			throw new APIError(HttpCode.BadRequest, AuthenticateError.AccountNotFound);
		}

		if (!verifyPassword(password, user.password)) {
			throw new APIError(HttpCode.Forbidden, AuthenticateError.PasswordIncorrect);
		}

		return user.toJSONPrivate();
	}

	public async putUserProfile(id: string, options: ProfileDataToCreate, file?: Express.Multer.File) {
		return getConnection().transaction(async entityManager => {
			if (!id) throw new APIError(HttpCode.BadRequest, PutProfileError.AccountNotFound);
			const user = await entityManager.findOneOrFail(User, { id })
				.catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PutProfileError.AccountNotFound)));


			// If a profile doesn't exist, create it
			const profile = user.profile ?? new Profile();
			const { twitter, instagram, yearOfStudy, course, facebook } = options;
			Object.assign(profile, { twitter, instagram, yearOfStudy: Number(yearOfStudy), course, facebook });
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

			const savedUser = await entityManager.save(user).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PutProfileError.InvalidEntryDetails)));
			if (processedAvatar) {
				await writeFile(`./assets/${user.id}.png`, processedAvatar);
			}
			return savedUser.toJSONPrivate();
		});
	}
}
