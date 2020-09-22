import { User } from '../entities/User';
import { getConnection, getRepository } from 'typeorm';
import { singleton } from 'tsyringe';
import { APIError, formatValidationErrors, HttpCode } from '../util/errors';
import { validateOrReject } from 'class-validator';
import Note, { APINote, NoteType } from '../entities/Note';

enum ReportUserError {
	UserNotFound = 'User not found',
	InvalidEntryDetails = 'Invalid user details.'
}

/* enum DeleteNoteError {
	UserNotFound = 'User not found',
	NoteNotFound = 'Note not found',
	UnauthorisedUser = 'User not authorised'
} */

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

	public async createNote(userID: string, targetUserID: string, data: NoteType): Promise<APINote> {
		return getConnection().transaction(async entityManager => {
			if (!userID) throw new APIError(HttpCode.NotFound, ReportUserError.UserNotFound);
			if (!targetUserID) throw new APIError(HttpCode.NotFound, ReportUserError.UserNotFound);
			const owner = await entityManager.findOneOrFail(User, { id: userID })
				.catch(() => Promise.reject(new APIError(HttpCode.NotFound, ReportUserError.UserNotFound)));
			const targetUser = await entityManager.findOneOrFail(User, { id: targetUserID })
				.catch(() => Promise.reject(new APIError(HttpCode.NotFound, ReportUserError.UserNotFound)));

			let note: Note | undefined;
			note = await getRepository(Note)
				.createQueryBuilder('note')
				.leftJoinAndSelect('note.owner', 'user')
				.where('user.id = :id', { id: userID })
				.leftJoinAndSelect('note.targetUser', 'targetUser')
				.where('targetUser.id = :id', { id: targetUserID })
				.getOne();
			if (note) {
				if (note.noteType === data) {
					return note.toJSON();
				}
			} else {
				note = new Note();
				note.owner = owner;
				note.targetUser = targetUser;
			}
			const noteType = data;
			Object.assign(note, { time: new Date(), noteType: noteType });
			await validateOrReject(note).catch(e => Promise.reject(formatValidationErrors(e)));
			await entityManager.save(note).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, ReportUserError.InvalidEntryDetails)));
			return note.toJSON();
		});
	}

	public async deleteNote(userID: string, targetUserID: string): Promise<void> {
		if (!userID) throw new APIError(HttpCode.NotFound, ReportUserError.UserNotFound);
		if (!targetUserID) throw new APIError(HttpCode.NotFound, ReportUserError.UserNotFound);

		await getRepository(Note)
			.createQueryBuilder()
			.delete()
			.from(Note)
			.where('owner.id = :id', { id: userID })
			.where('targetUser.id = :id', { id: targetUserID })
			.execute();
	}
}
