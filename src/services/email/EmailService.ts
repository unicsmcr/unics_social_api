import { injectable } from 'tsyringe';
import { getConfig } from '../../util/config';
import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

@injectable()
export default class EmailService {
	protected readonly transport: Mail;

	public constructor() {
		this.transport = createTransport(getConfig().email.config, {
			from: getConfig().email.fromEmail
		});
	}

	public async sendEmail(data: { to: string; html: string; subject: string }) {
		await this.transport.sendMail({
			to: data.to,
			subject: data.subject,
			text: 'Hi',
			html: data.html
		});
	}
}
