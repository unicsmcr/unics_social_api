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
}
