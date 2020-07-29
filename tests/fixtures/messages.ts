import Message, { APIMessage } from '../../src/entities/Message';
import { randomBytes } from 'crypto';
import { User, AccountStatus } from '../../src/entities/User';
import { Channel } from '../../src/entities/Channel';
import users from './users';
import events from './events';
import { v4 as uuidv4 } from 'uuid';

export function createMessage(data: { author?: User; channel?: Channel; content?: string }): [Pick<APIMessage, 'content' | 'authorID' | 'channelID' | 'time'>, Message] {
	const concreteData = {
		author: data.author ?? users.find(user => user.accountStatus === AccountStatus.Verified)!,
		channel: data.channel ?? events[0].channel,
		content: data.content ?? randomBytes(128).toString('hex')
	};
	const message = new Message();
	message.time = new Date();
	message.content = concreteData.content;
	message.author = concreteData.author;
	message.channel = concreteData.channel;
	message.id = uuidv4();

	return [
		{
			authorID: concreteData.author.id,
			channelID: concreteData.channel.id,
			content: concreteData.content,
			time: message.time.toISOString()
		},
		message
	];
}
