import { singleton } from 'tsyringe';
import Message, { APIMessage } from '../entities/Message';
import { getRepository } from 'typeorm';
import { APIError } from '../util/errors';

const PAGINATION_COUNT = 50;

type MessageCreationData = Omit<APIMessage, 'id' | 'time'>;

enum GetMessageError {
	NotFound = 'Message not found',
	InvalidChannel = 'Message does not exist for given channel'
}

enum GetMessagesError {
	ChannelNotFound = 'Channel does not exist',
	PageNumberMissing = 'Page number missing'
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

	public async getMessages(data: { channelID: string; page?: number }): Promise<APIMessage[]> {
		if (!data.page) data.page = 0;
		if (isNaN(data.page)) throw new APIError(400, GetMessagesError.PageNumberMissing);
		if (!data.channelID) throw new APIError(404, GetMessagesError.ChannelNotFound);
		const messages = await getRepository(Message)
			.createQueryBuilder('message')
			.leftJoinAndSelect('message.channel', 'channel')
			.leftJoinAndSelect('message.author', 'author')
			.where('channel.id = :id', { id: data.channelID })
			.orderBy('message.time', 'DESC')
			.skip(PAGINATION_COUNT * data.page)
			.take(PAGINATION_COUNT)
			.getMany();
		return messages.map(message => message.toJSON());
	}
}
