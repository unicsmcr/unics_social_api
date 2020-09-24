import { User } from '../entities/User';
import { getConnection } from 'typeorm';
import { singleton } from 'tsyringe';
import Profile from '../entities/Profile';
import { APIError, formatValidationErrors, HttpCode } from '../util/errors';
import { writeFile as _writeFile, unlink as _unlink } from 'fs';
import { validateOrReject } from 'class-validator';
import { promisify } from 'util';
import sharp from 'sharp';

const writeFile = promisify(_writeFile);
const unlink = promisify(_unlink);

export type ProfileDataToCreate = Omit<Profile, 'id' | 'user' | 'toJSON' | 'avatar'> & { avatar: string|boolean };

enum PutProfileError {
	AccountNotFound = 'Account not found.',
	InvalidEntryDetails = 'Invalid profile details.',
	InvalidAvatar = 'Avatar must be an image.'
}

@singleton()
export class ProfileService {
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
