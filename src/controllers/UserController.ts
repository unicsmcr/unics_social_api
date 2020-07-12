import { UserService } from '../services/UserService';
import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
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

	public constructor(@inject(UserService) _userService: UserService) {
		this.userService = _userService;
	}

	public async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			await this.userService.registerUser(req.body);
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
