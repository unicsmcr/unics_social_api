import { singleton } from 'tsyringe';
import Message, { APIMessage } from '../entities/Message';
import { getRepository } from 'typeorm';
import { APIError } from '../util/errors';

type MessageCreationData = Omit<APIMessage, 'id' | 'time'>;

enum GetMessageError {
	NotFound = 'Message not found',
	InvalidChannel = 'Message does not exist for given channel'
}

@singleton()
export default class MessageService {
	public async createMessage(data: MessageCreationData): Promise<APIMessage> {
		const message = new Message();
		message.content = data.content;
		message.time = new Date();
		message.author = { id: data.authorID } as any;
		message.channel = { id: data.channelID } as any;
		return (await getRepository(Message).save(message)).toJSON();
	}

	public async getMessage(data: Pick<APIMessage, 'id' | 'channelID'>): Promise<APIMessage> {
		if (!data.id) throw new APIError(404, GetMessageError.NotFound);
		const message = await getRepository(Message).findOneOrFail(data.id).catch(() => Promise.reject(new APIError(404, GetMessageError.NotFound)));
		if (message.channel.id !== data.channelID) throw new APIError(400, GetMessageError.InvalidChannel);
		return message.toJSON();
	}
}
