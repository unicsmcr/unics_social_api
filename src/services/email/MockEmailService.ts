import { injectable } from 'tsyringe';
import { getConfig } from '../../util/config';
import { writeFile as _writeFile, exists as _exists, mkdir as _mkdir } from 'fs';
import { promisify } from 'util';
const writeFile = promisify(_writeFile);
const exists = promisify(_exists);
const mkdir = promisify(_mkdir);

interface EmailData { to: string; html: string; subject: string }

const emailToRaw = (data: EmailData) =>
	`Time: ${new Date().toLocaleString()}
From: ${getConfig().email.fromEmail}
To: ${data.to}

Subject: ${data.subject}

Body:
----------
${data.html}
----------
END OF MESSAGE
`;

@injectable()
export default class MockEmailService {
	public async sendEmail(data: { to: string; html: string; subject: string }) {
		const fileToWrite = emailToRaw(data);
		if (!await exists('./emails')) {
			await mkdir('./emails');
		}
		await writeFile(`./emails/${Date.now()}.txt`, fileToWrite);
	}
}
