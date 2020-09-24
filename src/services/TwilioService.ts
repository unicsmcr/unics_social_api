import { singleton } from 'tsyringe';
import buildClient, { Twilio, jwt } from 'twilio';
import { getConfig } from '../util/config';
import { logger } from '../util/logger';
import { ROOM_TIME_LIMIT_TTL_SECS, ROOM_TIME_LIMIT_MS } from '../util/config/video';

interface GenerateAccessTokenOptions {
	userId: string;
	roomId: string;
}

@singleton()
export class TwilioService {
	private readonly twilioClient: Twilio;
	private timeouts: NodeJS.Timeout[];

	public constructor() {
		const { twilio } = getConfig();
		// to-do: dublin Edge Location for API access available Sept 1st, 2020
		// https://www.twilio.com/docs/global-infrastructure/edge-locations
		this.twilioClient = buildClient(twilio.accountSid, twilio.token);
		this.timeouts = [];
	}

	public teardown() {
		this.timeouts.forEach(clearInterval);
		this.timeouts = [];
	}

	public async createRoom(roomId: string): Promise<string> {
		const room = await this.twilioClient.video.rooms.create({
			enableTurn: true,
			type: 'peer-to-peer',
			uniqueName: roomId,
			maxParticipants: 2
		});

		// Set a timeout to complete the room
		this.timeouts.push(setTimeout(() => {
			this.completeRoom(room.sid)
				.then(() => null)
				.catch(err => logger.error(err));
		}, ROOM_TIME_LIMIT_MS));

		// We can use the given roomId (should be same as the uniqueName) to access the room in place of its actual SID
		return room.uniqueName;
	}

	public async completeRoom(roomId: string): Promise<void> {
		await this.twilioClient.video.rooms(roomId).update({
			status: 'completed'
		});
	}

	public generateAccessToken(options: GenerateAccessTokenOptions): string {
		const { twilio } = getConfig();
		const token = new jwt.AccessToken(twilio.accountSid, twilio.apiKey, twilio.secret, { identity: options.userId, ttl: ROOM_TIME_LIMIT_TTL_SECS });
		const videoGrant = new jwt.AccessToken.VideoGrant({
			room: options.roomId
		});
		token.addGrant(videoGrant);
		return token.toJwt();
	}
}
