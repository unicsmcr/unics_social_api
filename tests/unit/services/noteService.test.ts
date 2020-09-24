import 'reflect-metadata';
import Note, { NoteType } from '../../../src/entities/Note';
import { User } from '../../../src/entities/User';
import { NoteService } from '../../../src/services/NoteService';
import { createDBConnection } from '../../../src';
import users from '../../fixtures/users';
import { getConnection, getRepository } from 'typeorm';
import { HttpCode } from '../../../src/util/errors';

beforeAll(async () => {
	await createDBConnection();
});

afterEach(async () => {
	await getConnection().dropDatabase();
	await getConnection().synchronize();
});

const noteService = new NoteService();

describe('NoteService', () => {
	const user2 = users[1]; // owner
	const user1 = users[0]; // targetUser

	describe('getNotes()', () => {
		beforeEach(async () => {
			await getRepository(User).save([user2, user1]);
			await getRepository(Note).save(user2.notes!);
		});

		test('Returns empty list when no notes', async () => {
			await (expect(noteService.getNotes(user1.id))).resolves.toEqual([]);
		});

		test('Returns non-empty list of notes', async () => {
			const getNotes = await noteService.getNotes(user2.id);
			expect(getNotes[0]).toMatchObject({
				ownerID: user2.id,
				targetUserID: user1.id,
				noteType: user2.notes![0].noteType
			});
		});
	});

	describe('createNote()', () => {
		beforeEach(async () => {
			await getRepository(User).save([user2, user1]);
		});

		test('Creates a note with valid data', async () => {
			const createdNote = await noteService.createNote(user1.id, user2.id, { noteType: NoteType.Liked });
			expect(createdNote).toMatchObject({
				ownerID: user1.id,
				targetUserID: user2.id,
				noteType: NoteType.Liked
			});
		});

		test('Gets note if it already exists', async () => {
			await getRepository(Note).save(user2.notes!);
			const createdNote = await noteService.createNote(user2.id, user1.id, { noteType: NoteType.Blocked });
			expect(createdNote).toMatchObject({
				ownerID: user2.id,
				targetUserID: user1.id,
				noteType: user2.notes![0].noteType
			});
		});

		test('Changes to noteType are reflected in pre-existing note', async () => {
			await getRepository(Note).save(user2.notes!);
			const createdNote = await noteService.createNote(user2.id, user1.id, { noteType: NoteType.Liked });
			const noteChange = await getRepository(Note).findOneOrFail({ where: { owner: user2, targetUser: user1, noteType: NoteType.Liked }, relations: ['owner', 'targetUser'] });
			await expect(getRepository(Note).findOneOrFail({ noteType: NoteType.Blocked })).rejects.toThrow();
			expect(noteChange.toJSON()).toMatchObject({
				ownerID: user2.id,
				targetUserID: user1.id,
				noteType: createdNote.noteType,
				time: createdNote.time
			});
		});

		test('No change to noteType does not change pre-existing note', async () => {
			await getRepository(Note).save(user2.notes!);
			const createdNote = await noteService.createNote(user2.id, user1.id, { noteType: NoteType.Blocked });
			const noteChange = await getRepository(Note).findOneOrFail({ owner: user2, targetUser: user1, noteType: NoteType.Blocked });
			expect(noteChange.time.toISOString()).toStrictEqual(createdNote.time);
		});

		test('Fails with missing id\'s', async () => {
			const data = { noteType: NoteType.Liked };
			await expect(noteService.createNote(user2.id, '', data)).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
			await expect(noteService.createNote('', user1.id, data)).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
			await expect(noteService.createNote(user2.id, user1.id, { noteType: null } as any)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
		});
	});

	describe('deleteNote()', () => {
		beforeEach(async () => {
			await getRepository(User).save([user2, user1]);
			await getRepository(Note).save(user2.notes!);
		});

		test('Deletes note correctly', async () => {
			await expect(noteService.deleteNote(user2.id, user1.id)).resolves.not.toThrow();
		});

		test('Fails with missing id\'s', async () => {
			await expect(noteService.deleteNote(user2.id, '')).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
			await expect(noteService.deleteNote('', user1.id)).rejects.toMatchObject({ httpCode: HttpCode.NotFound });
		});
	});
});
