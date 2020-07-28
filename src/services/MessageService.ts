import { singleton } from 'tsyringe';
import Message, { APIMessage } from '../entities/Message';
import { getRepository } from 'typeorm';

type MessageCreationData = Omit<APIMessage, 'id' | 'time'>;

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
}
