import { UserService } from '../../services/UserService';
import ChannelService from '../../services/ChannelService';
import { inject, injectable } from 'tsyringe';
import { APIDMChannel } from '../../entities/Channel';

interface QueueUser {
	user: {
		id: string;
		yearOfStudy: number;
	};
	options: QueueOptions;
}

export interface QueueOptions {
	sameYear: boolean;
}

interface QueueMatchData {
	users: [string, string];
	channel: APIDMChannel;
}

@injectable()
export class DiscoveryQueue {
	private readonly userService: UserService;
	private readonly channelService: ChannelService;
	public readonly queue: Set<QueueUser>;

	public constructor(@inject(UserService) userService: UserService, @inject(ChannelService) channelService: ChannelService) {
		this.userService = userService;
		this.channelService = channelService;
		this.queue = new Set();
	}

	private async matchUsers(user1: string, user2: string): Promise<QueueMatchData> {
		// Remove the members from the queue
		for (const queueUser of this.queue.values()) {
			if (queueUser.user.id === user1 || queueUser.user.id === user2) {
				this.queue.delete(queueUser);
			}
		}

		// Create the DM channel for the users
		const dmChannel = await this.channelService.createOrGetDMChannel([user1, user2]);

		return {
			users: [user1, user2],
			channel: dmChannel
		};
	}

	/**
	 * Adds a new user to the discovery queue and tries to pair them to someone
	 * @param userId The user to add
	 * @param options The options for matching
	 * @returns the queue match data if a match was made
	 */
	public async addToQueue(userId: string, options: QueueOptions): Promise<QueueMatchData|undefined> {
		for (const queueUser of this.queue.values()) {
			if (queueUser.user.id === userId) {
				return;
			}
		}

		const user = await this.userService.findOne({ id: userId }, { relations: ['dmChannels'] });
		if (!user) throw new Error('User not found');
		if (!user.profile) throw new Error('User profile is required');

		// A list of DM channels that the user already has
		const ineligibleIDs = user.dmChannels.map(channel => channel.users.map(user => user.id)).flat();

		for (const queueUser of this.queue.values()) {
			// If the potential user already has a dm channel with the new user, skip
			if (ineligibleIDs.includes(queueUser.user.id)) {
				continue;
			}

			// If either of the users require someone to be in the same year
			if (queueUser.options.sameYear || options.sameYear) {
				// Check that both users have the same year
				if (queueUser.user.yearOfStudy === user.profile.yearOfStudy) {
					return this.matchUsers(user.id, queueUser.user.id);
				}
			// If neither user requires the same year, then match
			} else {
				return this.matchUsers(user.id, queueUser.user.id);
			}
		}
	}
}
