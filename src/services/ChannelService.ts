import { singleton } from 'tsyringe';
import { getRepository, FindOneOptions, FindConditions, getConnection } from 'typeorm';
import { Channel, DMChannel, APIDMChannel, APIChannel, EventChannel } from '../entities/Channel';
import { User, AccountStatus } from '../entities/User';
import { APIError } from '../util/errors';

enum CreateDMChannelError {
	InvalidUserCount = 'Exactly 2 users can be in a DM channel at the moment',
	UsersNotVerified = 'Not all users have a verified account'
}

@singleton()
export default class ChannelService {
	public async findOne(findConditions: FindConditions<Channel>, options?: FindOneOptions) {
		return getRepository(Channel).findOne(findConditions, options);
	}

	public async createOrGetDMChannel(recipientIDs: string[]): Promise<APIDMChannel> {
		return getConnection().transaction(async entityManager => {
			if (recipientIDs.length !== 2) throw new APIError(400, CreateDMChannelError.InvalidUserCount);

			// Find all DM Channels with at least one of the users in it
			const channels = await entityManager
				.createQueryBuilder(DMChannel, 'dmChannel')
				.select(['dmChannel', 'user.id'])
				.innerJoin('dmChannel.users', 'user')
				.where('user.id IN (:...recipientIDs)', { recipientIDs })
				.getMany();

			// Try to find a channel that has only the recipients
			for (const channel of channels) {
				if (channel.users.every(user => recipientIDs.includes(user.id)) && channel.users.length === recipientIDs.length) {
					return channel.toJSON();
				}
			}

			// No existing channel exists, so create a new one
			const recipients = await entityManager.findByIds(User, recipientIDs);

			// Ensure that all the recipients are verified
			if (recipients.some(recipient => recipient.accountStatus !== AccountStatus.Verified)) {
				throw new APIError(400, CreateDMChannelError.UsersNotVerified);
			}

			const channel = new DMChannel();
			channel.users = recipients;
			await entityManager.save(channel);

			return channel.toJSON();
		});
	}

	public async getChannelsForUser(id: string): Promise<APIChannel[]> {
		const [eventChannels, dmChannels] = await Promise.all([
			getRepository(EventChannel).find({ relations: ['event'] }),
			(await getConnection()
				.createQueryBuilder(DMChannel, 'dmChannel')
				.select(['dmChannel', 'user.id'])
				.leftJoin('dmChannel.users', 'user')
				.getMany()).filter(channel => channel.users.some(user => user.id === id))
		]);
		return [
			...eventChannels,
			...dmChannels
		].map(channel => channel.toJSON());
	}
}
