import { UserService } from '../services/UserService';
import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import EmailService from '../services/EmailService';
import { VerifyEmailTemplate } from '../util/emails';
import { generateJWT } from '../util/auth';
/*
	to-do:
	improve error handling, use more enums, do not expose raw errors to enduser
*/

enum VerifyError {
	ConfirmationIdNotString = 'confirmationId is invalid'
}

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

	public async verifyUserEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			if (typeof req.query.confirmationId !== 'string') throw new Error(VerifyError.ConfirmationIdNotString);
			await this.userService.verifyUserEmail(req.query.confirmationId);
			res.status(204).end();
		} catch (error) {
			next(error);
		}
	}

	public async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.authenticate(req.body.email, req.body.password);
			const token = await generateJWT(user);
			res.json({ token });
		} catch (error) {
			next(error);
		}
	}
}
