import { send, setApiKey } from '@sendgrid/mail';
import { injectable } from 'tsyringe';
import { getConfig } from '../util/config';

@injectable()
export default class EmailService {
	public constructor() {
		setApiKey(getConfig().sendgridToken);
	}

	public sendEmail(data: { to: string; html: string; subject: string }) {
		setApiKey(getConfig().sendgridToken);
		return send({
			from: 'noreply@unicsmcr.com',
			...data
		});
	}
}
