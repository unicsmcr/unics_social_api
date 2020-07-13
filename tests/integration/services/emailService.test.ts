import 'reflect-metadata';

import sendgrid from '@sendgrid/mail';
import EmailService from '../../../src/services/EmailService';

const mockedSend = jest.spyOn(sendgrid, 'send');

beforeEach(() => {
	mockedSend.mockReset();
});

describe('EmailService', () => {
	test('Succeeds when send succeeds', async () => {
		const fixture = {
			html: 'hi',
			subject: 'hi',
			to: 'hi@gmail.com'
		};

		mockedSend.mockResolvedValueOnce({} as any);

		const emailService = new EmailService();
		await emailService.sendEmail(fixture);
		expect(mockedSend).toHaveBeenCalledWith({ ...fixture, from: 'noreply@unicsmcr.com' });
	});

	test('Fails when send fails', async () => {
		const fixture = {
			html: '<b>Hi!</b>',
			subject: 'Verify your account',
			to: 'user@gmail.com'
		};

		mockedSend.mockRejectedValueOnce(new Error('Failed!'));

		const emailService = new EmailService();
		await expect(emailService.sendEmail(fixture)).rejects.toThrow();
		expect(mockedSend).toHaveBeenCalledWith({ ...fixture, from: 'noreply@unicsmcr.com' });
	});
});
