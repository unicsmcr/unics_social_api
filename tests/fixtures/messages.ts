import Message, { APIMessage } from '../../src/entities/Message';
import { randomBytes } from 'crypto';
import { User, AccountStatus } from '../../src/entities/User';
import { Channel } from '../../src/entities/Channel';
import users from './users';
import events from './events';
import { v4 as uuidv4 } from 'uuid';

export function createMessage(data: { author?: User; channel?: Channel; content?: string; time?: Date }): [Pick<APIMessage, 'content' | 'time'> & { author: User; channel: Channel }, Message] {
	const concreteData = {
		author: data.author ?? users.find(user => user.accountStatus === AccountStatus.Verified)!,
		channel: data.channel ?? events[0].channel,
		content: data.content ?? randomBytes(128).toString('hex'),
		time: data.time ?? new Date()
	};
	const message = new Message();
	message.time = concreteData.time;
	message.content = concreteData.content;
	message.author = concreteData.author;
	message.channel = concreteData.channel;
	message.id = uuidv4();

	/*
		Warning! The returned message ID is not guaranteed to be the same as the ID of the message created with the given fixture data.
	*/
	return [
		{
			author: concreteData.author,
			channel: concreteData.channel,
			content: concreteData.content,
			time: message.time.toISOString()
		},
		message
	];
}
