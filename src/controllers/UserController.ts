import { UserService } from '../services/UserService';
import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import EmailService from '../services/EmailService';
/*
	to-do:
	improve error handling, use more enums, do not expose raw errors to enduser
*/

enum VerifyError {
	ConfirmationIdNotString = 'confirmationId is invalid'
}

const VerifyEmailTemplate = (name: string, confirmationId: string) =>
	`<b>Hi ${name}!</b>

<p>We need you to activate your UniCS KB account.</p>

<p>
<a href="https://URLPLACEHOLDER.com/verify?confirmationId=${confirmationId}">Click here to confirm your email address</a>.
If that link does not work, please follow https://URLPLACEHOLDER.com/verify?confirmationId=${confirmationId}.
</p>

<p>
Didn't make this request? No worries, you don't need to do anything.
</p>

<p>
Thanks,<br />
The UniCS Robot 🤖
</p>

<br />
<br />

<img src="https://unicsmcr.com/assets/logo.png" />
`;

@injectable()
export class UserController {
	private readonly userService: UserService;
	private readonly emailService: EmailService;

	public constructor(@inject(UserService) _userService: UserService, @inject(EmailService) _emailService: EmailService) {
		this.userService = _userService;
		this.emailService = _emailService;
	}

	public async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const confirmation = await this.userService.registerUser(req.body);
			await this.emailService.sendEmail({
				to: confirmation.user.email,
				subject: 'Verify your UniCS KB email',
				html: VerifyEmailTemplate(confirmation.user.forename, confirmation.id)
			});
			res.status(204).end();
		} catch (error) {
			next(error);
		}
	}

	public async verifyUser(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			if (typeof req.query.confirmationId !== 'string') throw new Error(VerifyError.ConfirmationIdNotString);
			await this.userService.verifyUser(req.query.confirmationId);
			res.status(204).end();
		} catch (error) {
			next(error);
		}
	}
}
