import { singleton } from 'tsyringe';
import Message, { APIMessage } from '../entities/Message';
import { getRepository, getConnection } from 'typeorm';
import { APIError, formatValidationErrors, HttpCode } from '../util/errors';
import { validateOrReject } from 'class-validator';
import { Channel } from '../entities/Channel';
import { User } from '../entities/User';

type MessageCreationData = Omit<APIMessage, 'id' | 'channelID' | 'authorID'> & { channel: Channel; author: User };

enum GetMessageError {
	NotFound = 'Message not found',
	InvalidChannel = 'Message does not exist for given channel'
}

enum DeleteMessageError {
	NotFound = 'Message not found',
	InvalidChannel = 'Message does not exist for given channel',
	NotAuthor = 'You are not the author of this message'
}

@singleton()
export default class MessageService {
	public createMessage(data: MessageCreationData): Promise<APIMessage> {
		return getConnection().transaction(async entityManager => {
			const message = new Message();
			message.content = data.content;
			message.time = new Date(data.time);
			message.author = data.author;
			message.channel = data.channel;
			await validateOrReject(message).catch(e => Promise.reject(formatValidationErrors(e)));
			const savedMessage = await entityManager.save(message);
			await entityManager.update(Channel, data.channel.id, { lastUpdated: message.time });
			return savedMessage.toJSON();
		});
	}

	public async getMessage(data: Pick<APIMessage, 'id' | 'channelID'>): Promise<APIMessage> {
		if (!data.id) throw new APIError(HttpCode.NotFound, GetMessageError.NotFound);
		const message = await getRepository(Message).findOneOrFail(data.id).catch(() => Promise.reject(new APIError(HttpCode.NotFound, GetMessageError.NotFound)));
		if (message.channel.id !== data.channelID) throw new APIError(HttpCode.BadRequest, GetMessageError.InvalidChannel);
		return message.toJSON();
	}

	public async getMessages(data: { channel: Channel; page?: number; count: number }): Promise<APIMessage[]> {
		if (!data.page || isNaN(data.page)) data.page = 0;
		const messages = await getRepository(Message)
			.find({
				where: { channel: data.channel },
				order: { time: 'DESC' },
				skip: data.count * data.page,
				take: data.count
			});
		return messages.map(message => message.toJSON());
	}

	public deleteMessage(data: Pick<APIMessage, 'id' | 'channelID'> & { authorID?: string }): Promise<void> {
		return getConnection().transaction(async entityManager => {
			if (!data.id) throw new APIError(HttpCode.NotFound, DeleteMessageError.NotFound);
			const message = await entityManager.findOneOrFail(Message, data.id).catch(() => Promise.reject(new APIError(HttpCode.NotFound, DeleteMessageError.NotFound)));
			if (message.channel.id !== data.channelID) throw new APIError(HttpCode.BadRequest, DeleteMessageError.InvalidChannel);
			// If authorID is omitted, it means that the user has admin rights and does not need to provide their ID
			if (data.authorID && message.author.id !== data.authorID) throw new APIError(HttpCode.BadRequest, DeleteMessageError.NotAuthor);
			await entityManager.delete(Message, message.id);
			await entityManager.update(Channel, message.channel.id, { lastUpdated: new Date() });
		});
	}
}
