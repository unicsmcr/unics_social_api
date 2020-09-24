import { User } from '../entities/User';
import { getConnection, getRepository } from 'typeorm';
import { singleton } from 'tsyringe';
import { APIError, formatValidationErrors, HttpCode } from '../util/errors';
import { validateOrReject } from 'class-validator';
import Note, { APINote } from '../entities/Note';

export type NoteDataToCreate = Pick<Note, 'noteType' >;

enum NoteUserError {
	NoteTypeNotFound = 'Note Type not found',
	UserNotFound = 'User not found',
	InvalidEntryDetails = 'Invalid user details.',
	NoteBadRequest = 'Bad request'
}

@singleton()
export class NoteService {
	public async getNotes(userID: string): Promise<APINote[]> {
		const notes = await getRepository(Note)
			.createQueryBuilder('note')
			.leftJoinAndSelect('note.owner', 'user')
			.where('user.id = :id', { id: userID })
			.leftJoinAndSelect('note.targetUser', 'targetUser')
			.getMany();
		return notes.map(note => note.toJSON());
	}

	public async createNote(userID: string, targetUserID: string, data: NoteDataToCreate): Promise<APINote> {
		return getConnection().transaction(async entityManager => {
			if (!userID) throw new APIError(HttpCode.NotFound, NoteUserError.UserNotFound);
			if (!targetUserID) throw new APIError(HttpCode.NotFound, NoteUserError.UserNotFound);
			const owner = await entityManager.findOneOrFail(User, { id: userID })
				.catch(() => Promise.reject(new APIError(HttpCode.NotFound, NoteUserError.UserNotFound)));
			const targetUser = await entityManager.findOneOrFail(User, { id: targetUserID })
				.catch(() => Promise.reject(new APIError(HttpCode.NotFound, NoteUserError.UserNotFound)));

			let note: Note | undefined;
			note = await getRepository(Note)
				.createQueryBuilder('note')
				.leftJoinAndSelect('note.owner', 'user')
				.where('user.id = :id', { id: userID })
				.leftJoinAndSelect('note.targetUser', 'targetUser')
				.where('targetUser.id = :id', { id: targetUserID })
				.getOne();
			if (note) {
				if (note.noteType === data.noteType) {
					return note.toJSON();
				}
			} else {
				note = new Note();
				note.owner = owner;
				note.targetUser = targetUser;
			}
			const { noteType } = data;
			Object.assign(note, { time: new Date(), noteType: noteType });
			await validateOrReject(note).catch(e => Promise.reject(formatValidationErrors(e)));
			await entityManager.save(note).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, NoteUserError.InvalidEntryDetails)));
			return note.toJSON();
		});
	}

	public async deleteNote(userID: string, targetUserID: string): Promise<void> {
		if (!userID) throw new APIError(HttpCode.NotFound, NoteUserError.UserNotFound);
		if (!targetUserID) throw new APIError(HttpCode.NotFound, NoteUserError.UserNotFound);

		await getRepository(Note)
			.createQueryBuilder()
			.delete()
			.from(Note)
			.where('owner.id = :id', { id: userID })
			.where('targetUser.id = :id', { id: targetUserID })
			.execute();
	}
}
