import 'reflect-metadata';

import { createDBConnection } from '../../../src';
import { getConnection, getRepository } from 'typeorm';
import '../../util/dbTeardown';
import MessageService from '../../../src/services/MessageService';
import users from '../../fixtures/users';
import events from '../../fixtures/events';
import { createMessage } from '../../fixtures/messages';
import { AccountStatus, User } from '../../../src/entities/User';
import { Channel } from '../../../src/entities/Channel';
import Message from '../../../src/entities/Message';

beforeAll(async () => {
	await createDBConnection();
});

afterEach(async () => {
	await getConnection().dropDatabase();
	await getConnection().synchronize();
});

const messageService = new MessageService();

describe('EventService', () => {
	const author = users.find(user => user.accountStatus === AccountStatus.Verified)!;
	const channel = events[0].channel;

	beforeEach(async () => {
		await getRepository(User).save(author);
		await getRepository(Channel).save(channel);
	});

	describe('createEvent', () => {
		const [basePayload, baseMessage] = createMessage({ author, channel });

		test('Creates an event with valid data', async () => {
			const createdMessage = await messageService.createMessage(basePayload);
			expect({ ...createdMessage, id: baseMessage.id }).toEqual(baseMessage.toJSON());
		});

		test('Throws when invalid data passed', async () => {
			await expect(messageService.createMessage({ ...basePayload, content: '' })).rejects.toMatchObject({ httpCode: 400 });
			await expect(messageService.createMessage({ ...basePayload, time: '' })).rejects.toMatchObject({ httpCode: 400 });
			// The following 2 outcomes would be unexpected in production
			await expect(messageService.createMessage({ ...basePayload, authorID: '' })).rejects.toThrow();
			await expect(messageService.createMessage({ ...basePayload, channelID: '' })).rejects.toThrow();
		});
	});

	describe('getMessage', () => {
		const [, baseMessage] = createMessage({ author, channel });

		beforeEach(async () => {
			await getRepository(Message).save(baseMessage);
		});

		test('Finds message with valid data', async () => {
			const receivedMessage = await messageService.getMessage({
				channelID: baseMessage.channel.id,
				id: baseMessage.id
			});
			expect(receivedMessage).toEqual(baseMessage.toJSON());
		});

		test('Fails for unknown message', async () => {
			await expect(messageService.getMessage({
				channelID: baseMessage.channel.id,
				id: 'fakeid'
			})).rejects.toMatchObject({ httpCode: 404 });
		});

		test('Fails for channel mismatch', async () => {
			await expect(messageService.getMessage({
				channelID: 'fakechannelid',
				id: baseMessage.id
			})).rejects.toMatchObject({ httpCode: 400 });
		});
	});


	describe('deleteMessage', () => {
		const [, baseMessage] = createMessage({ author, channel });

		beforeEach(async () => {
			await getRepository(Message).save(baseMessage);
		});

		test('Deletes message with valid data (admin)', async () => {
			await expect(messageService.deleteMessage({
				channelID: baseMessage.channel.id,
				id: baseMessage.id
			})).resolves.not.toThrow();
		});

		test('Fails for unknown message (admin)', async () => {
			await expect(messageService.deleteMessage({
				channelID: baseMessage.channel.id,
				id: 'fakeid'
			})).rejects.toMatchObject({ httpCode: 404 });
		});

		test('Fails for channel mismatch (admin)', async () => {
			await expect(messageService.deleteMessage({
				channelID: 'fakeid',
				id: baseMessage.id
			})).rejects.toMatchObject({ httpCode: 400 });
		});

		test('Deletes message with valid data (user)', async () => {
			await expect(messageService.deleteMessage({
				channelID: baseMessage.channel.id,
				id: baseMessage.id,
				authorID: author.id
			})).resolves.not.toThrow();
		});

		test('Fails for unknown message (user)', async () => {
			await expect(messageService.deleteMessage({
				channelID: baseMessage.channel.id,
				id: 'fakeid',
				authorID: author.id
			})).rejects.toMatchObject({ httpCode: 404 });
		});

		test('Fails for channel mismatch (user)', async () => {
			await expect(messageService.deleteMessage({
				channelID: 'fakeid',
				id: baseMessage.id,
				authorID: author.id
			})).rejects.toMatchObject({ httpCode: 400 });
		});

		test('Fails when user is not author', async () => {
			await expect(messageService.deleteMessage({
				channelID: 'fakeid',
				id: baseMessage.id,
				authorID: 'fakeuserid'
			})).rejects.toMatchObject({ httpCode: 400 });
		});
	});
});
