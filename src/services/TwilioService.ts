import { singleton } from 'tsyringe';
import buildClient, { Twilio } from 'twilio';
import { getConfig } from '../util/config';

@singleton()
export class TwilioService {
	private readonly twilioClient: Twilio;
	public constructor() {
		const { twilio } = getConfig();
		this.twilioClient = buildClient(twilio.accountSid, twilio.token);
	}

	public async createRoom(roomId: string): Promise<string> {
		const room = await this.twilioClient.video.rooms.create({
			enableTurn: true,
			type: 'peer-to-peer',
			uniqueName: roomId,
			maxParticipants: 2
		});
		// We can use the given roomId to access the room in place of its actual SID
		return room.uniqueName;
	}

	public async completeRoom(roomId: string): Promise<void> {
		await this.twilioClient.video.rooms(roomId).update({
			status: 'completed'
		});
	}
}
