import { UserService } from '../../services/UserService';
import ChannelService from '../../services/ChannelService';
import { inject, singleton } from 'tsyringe';
import { DMChannel } from '../../entities/Channel';
import { Year } from '../../entities/Profile';
import { getDepartmentFromCourse } from '../config/courses';
import { getConfig } from '../config';
import { logger } from '../logger';

interface QueueUser {
	user: {
		id: string;
		yearOfStudy: Year;
		department: string;
	};
	options: QueueOptions;
}

export interface QueueOptions {
	sameYear: boolean;
	sameDepartment: boolean;
}

export interface QueueMatchData {
	users: [string, string];
	channel: DMChannel;
}

@singleton()
export class DiscoveryQueue {
	private readonly userService: UserService;
	private readonly channelService: ChannelService;
	public readonly queue: Set<QueueUser>;
	private readonly eventUsers: Set<string>;

	public constructor(@inject(UserService) userService: UserService, @inject(ChannelService) channelService: ChannelService) {
		this.userService = userService;
		this.channelService = channelService;
		this.queue = new Set();
		const eventUsers = getConfig().eventUsers;
		if (eventUsers.length > 0) {
			logger.info(`Configured event users (${eventUsers.length}): ${eventUsers.join(', ')}`);
		} else {
			logger.info(`No event users configured for networking`);
		}
		this.eventUsers = new Set(eventUsers);
	}

	private async matchUsers(user1: string, user2: string): Promise<QueueMatchData> {
		// Remove the members from the queue
		for (const queueUser of this.queue.values()) {
			if (queueUser.user.id === user1 || queueUser.user.id === user2) {
				this.queue.delete(queueUser);
			}
		}

		// Create the DM channel for the users
		const dmChannel = await this.channelService.createOrGetDMChannelRaw({ recipientIDs: [user1, user2], hasVideo: true, wantAccessToken: true });

		return {
			users: [user1, user2],
			channel: dmChannel
		};
	}

	/**
	 * Returns true if the users are able to match based on their preferences
	 * @param user1 The first user
	 * @param user2 The second user
	 */
	private usersCanMatch(user1: QueueUser, user2: QueueUser): boolean {
		if (user1.options.sameYear || user2.options.sameYear) {
			if (user1.user.yearOfStudy !== user2.user.yearOfStudy) {
				return false;
			}
		}
		if (user1.options.sameDepartment || user2.options.sameDepartment) {
			if (user1.user.department !== user2.user.department) {
				return false;
			}
		}
		return true;
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

		const newUser = {
			user: {
				id: user.id,
				yearOfStudy: user.profile.yearOfStudy,
				department: getDepartmentFromCourse(user.profile.course)
			},
			options: {
				sameYear: options.sameYear,
				sameDepartment: options.sameDepartment
			}
		};

		for (const queueUser of this.queue.values()) {
			// If the potential user already has a dm channel with the new user, skip
			if (ineligibleIDs.includes(queueUser.user.id)) {
				continue;
			}

			// If the users can match based on their preferences, do so. Otherwise, match them if either is an event user.
			if (this.usersCanMatch(newUser, queueUser) || this.eventUsers.has(user.id) || this.eventUsers.has(queueUser.user.id)) {
				return this.matchUsers(user.id, queueUser.user.id);
			}
		}
		// No match :(
		this.queue.add(newUser);
	}

	public removeFromQueue(userId: string): void {
		for (const queueUser of this.queue.values()) {
			if (queueUser.user.id === userId) {
				this.queue.delete(queueUser);
			}
		}
	}
}
