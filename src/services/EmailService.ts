import { send, setApiKey } from '@sendgrid/mail';
import { injectable } from 'tsyringe';
import { getConfig } from '../util/config';

@injectable()
export default class EmailService {
	public constructor() {
		setApiKey(getConfig().sendgrid.token);
	}

	public sendEmail(data: { to: string; html: string; subject: string }) {
		setApiKey(getConfig().sendgrid.token);
		return send({
			from: getConfig().sendgrid.fromEmail,
			...data
		});
	}
}
