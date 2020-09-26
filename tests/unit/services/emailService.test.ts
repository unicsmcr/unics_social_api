import 'reflect-metadata';

import MockEmailService from '../../../src/services/email/MockEmailService';

describe('EmailService', () => {
	test('Succeeds when send succeeds', async () => {
		const fixture = {
			html: 'hi',
			subject: 'hi',
			to: 'hi@gmail.com'
		};

		const emailService = new MockEmailService();
		await emailService.sendEmail(fixture);
	});
});
