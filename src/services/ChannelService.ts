import { singleton, inject } from 'tsyringe';
import { getRepository, FindOneOptions, FindConditions, getConnection } from 'typeorm';
import { Channel, DMChannel, APIDMChannel, APIChannel, EventChannel } from '../entities/Channel';
import { User, AccountStatus } from '../entities/User';
import { APIError } from '../util/errors';
import { TwilioService } from './TwilioService';
import { VideoIntegration } from '../entities/VideoIntegration';
import { VideoUser } from '../entities/VideoUser';

enum CreateDMChannelError {
	InvalidUserCount = 'Exactly 2 users can be in a DM channel at the moment',
	UsersNotVerified = 'Not all users have a verified account'
}

@singleton()
export default class ChannelService {
	private readonly twilioService: TwilioService;

	public constructor(@inject(TwilioService) twilioService: TwilioService) {
		this.twilioService = twilioService;
	}

	public async findOne(findConditions: FindConditions<Channel>, options?: FindOneOptions) {
		return getRepository(Channel).findOne(findConditions, options);
	}

	public async createOrGetDMChannel(options: { recipientIDs: string[]; hasVideo?: boolean; wantAccessToken?: boolean; videoUsersFilter?: (videoUser: VideoUser) => boolean }): Promise<APIDMChannel> {
		return (await this.createOrGetDMChannelRaw(options)).toJSON(options.videoUsersFilter);
	}

	public async createOrGetDMChannelRaw(options: { recipientIDs: string[]; hasVideo?: boolean; wantAccessToken?: boolean }): Promise<DMChannel> {
		return getConnection().transaction(async entityManager => {
			const { recipientIDs, hasVideo, wantAccessToken } = options;
			if (recipientIDs.length !== 2) throw new APIError(400, CreateDMChannelError.InvalidUserCount);

			// NOTE! recipientIDs[0] should be the user making the request!

			// Find all DM Channels with at least one of the users in it
			const channels = await entityManager
				.createQueryBuilder(DMChannel, 'dmChannel')
				.select(['dmChannel', 'user.id', 'videoIntegration'])
				.leftJoin('dmChannel.videoIntegration', 'videoIntegration')
				.innerJoin('dmChannel.users', 'user')
				.where('user.id IN (:...recipientIDs)', { recipientIDs })
				.getMany();

			// Try to find a channel that has only the recipients
			for (const channel of channels) {
				if (channel.users.every(user => recipientIDs.includes(user.id)) && channel.users.length === recipientIDs.length) {
					if (channel.videoIntegration) {
						channel.videoIntegration.videoUsers = []; // undefined at this point since was not fetched by queryBuilder
						if (wantAccessToken && new Date() <= new Date(channel.videoIntegration.endTime)) {
							channel.videoIntegration.videoUsers = await entityManager
								.createQueryBuilder(VideoUser, 'videoUser')
								.select(['videoUser', 'user.id'])
								.leftJoin('videoUser.user', 'user')
								.innerJoin('videoUser.videoIntegration', 'videoIntegration')
								.where('videoIntegration.id = :id', { id: channel.videoIntegration.id })
								.getMany();
						}
					}
					return channel;
				}
			}

			// No existing channel exists, so create a new one
			const recipients = await entityManager.findByIds(User, recipientIDs);

			// Ensure that all the recipients are verified
			if (recipients.some(recipient => recipient.accountStatus !== AccountStatus.Verified) || recipients.length !== recipientIDs.length) {
				throw new APIError(400, CreateDMChannelError.UsersNotVerified);
			}

			const channel = new DMChannel();
			channel.users = recipients;

			if (hasVideo) {
				let videoIntegration = entityManager.create(VideoIntegration, {
					dmChannel: channel,
					creationTime: new Date(),
					endTime: new Date(Date.now() + (1000 * 60 * 5)),
					videoUsers: []
				});
				videoIntegration = await entityManager.save(videoIntegration);
				const roomId = await this.twilioService.createRoom(videoIntegration.id);
				const videoUsers = recipients.map(user => {
					const accessToken = this.twilioService.generateAccessToken({ roomId, userId: user.id });
					return entityManager.create(VideoUser, {
						user,
						videoIntegration,
						accessToken
					});
				});
				videoIntegration.videoUsers = videoUsers;
				channel.videoIntegration = videoIntegration;
				await entityManager.save(videoIntegration);
			}
			return entityManager.save(channel);
		});
	}

	public async getChannelsForUser(id: string, wantAccessToken = true): Promise<APIChannel[]> {
		// Sort the dmChannels within the query for speed
		const [eventChannels, dmChannels] = await Promise.all([
			getRepository(EventChannel).find({ relations: ['event'], order: { lastUpdated: 'DESC' } }),
			(await getConnection()
				.createQueryBuilder(DMChannel, 'dmChannel')
				.select(['dmChannel', 'user.id', 'videoIntegration'])
				.leftJoin('dmChannel.users', 'user')
				.leftJoin('dmChannel.videoIntegration', 'videoIntegration')
				.orderBy('dmChannel.lastUpdated', 'DESC')
				.getMany()).filter(channel => channel.users.some(user => user.id === id))
		]);

		for (const channel of dmChannels) {
			if (channel.videoIntegration) {
				channel.videoIntegration.videoUsers = []; // undefined at this point since was not fetched by queryBuilder
				if (wantAccessToken && new Date() <= new Date(channel.videoIntegration.endTime)) {
					channel.videoIntegration.videoUsers = await getConnection()
						.createQueryBuilder(VideoUser, 'videoUser')
						.select(['videoUser', 'user.id'])
						.leftJoin('videoUser.user', 'user')
						.innerJoin('videoUser.videoIntegration', 'videoIntegration')
						.where('videoIntegration.id = :id AND user.id = :userID', { id: channel.videoIntegration.id, userID: id })
						.getMany();
				}
			}
		}

		return [
			...eventChannels,
			...dmChannels
		].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()).map(channel => channel.toJSON());
	}
}
