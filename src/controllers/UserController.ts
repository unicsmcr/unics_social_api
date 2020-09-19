import { UserService } from '../services/UserService';
import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import EmailService from '../services/email/EmailService';
import { VerifyEmailTemplate, PassowrdEmailTemplate, ReportEmailTemplate } from '../util/emails';
import { generateJWT, TokenType } from '../util/auth';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import { APIError, HttpCode } from '../util/errors';
import ChannelService from '../services/ChannelService';

enum GetUserError {
	UserNotFound = 'User not found',
}


@injectable()
export class UserController {
	private readonly userService: UserService;
	private readonly emailService: EmailService;
	private readonly channelService: ChannelService;

	public constructor(@inject(UserService) userService: UserService, @inject(EmailService) emailService: EmailService, @inject(ChannelService) channelService: ChannelService) {
		this.userService = userService;
		this.emailService = emailService;
		this.channelService = channelService;
	}

	public async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.registerUser(req.body);
			const token = await generateJWT({ ...user, tokenType: TokenType.EmailVerify });
			await this.emailService.sendEmail({
				to: user.email,
				subject: 'Verify your UniCS KB email',
				html: VerifyEmailTemplate(user.forename, token)
			});
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}

	public async verifyUserEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			await this.userService.verifyUserEmail(res.locals.user.id);
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}

	public async resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.getUserByEmail(req.body.email);
			const token = await generateJWT({ ...user, tokenType: TokenType.EmailVerify });
			await this.emailService.sendEmail({
				to: user.email,
				subject: 'Verify your UniCS KB email',
				html: VerifyEmailTemplate(user.forename, token)
			});
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}

	public async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.authenticate(req.body.email, req.body.password);
			const token = await generateJWT({ ...user, tokenType: TokenType.Auth });
			res.json({ token });
		} catch (error) {
			next(error);
		}
	}

	public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.forgotPassword(req.body);
			const token = await generateJWT({ ...user, tokenType: TokenType.PasswordReset });
			await this.emailService.sendEmail({
				to: user.email,
				subject: 'Reset your KB password',
				html: PassowrdEmailTemplate(user.forename, token)
			});
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}

	public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.resetPassword(res.locals.user.id, req.body);
			res.json({ user });
		} catch (error) {
			next(error);
		}
	}

	public async getUser(req: Request & { params: { id: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			if (!req.params.id) throw new APIError(HttpCode.NotFound, GetUserError.UserNotFound);
			if (req.params.id === '@me') req.params.id = res.locals.user.id;
			const user = await this.userService.findOne({ id: req.params.id });
			if (!user) throw new APIError(HttpCode.NotFound, GetUserError.UserNotFound);
			res.json({
				user: user.toJSON()
			});
		} catch (error) {
			next(error);
		}
	}

	public async getPublicUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const users = await this.userService.findAllPublic();
			res.json({ users });
		} catch (error) {
			next(error);
		}
	}

	public async reportUser(req: Request & { params: { id: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const report = await this.userService.reportUser(res.locals.user.id, req.params.id, req.body);
			await this.emailService.sendEmail({
				to: 'team@unicsmcr.com',
				subject: 'A Reported User',
				html: ReportEmailTemplate(report)
			});
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}

	public async putUserProfile(req: Request & { file?: Express.Multer.File }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const user = await this.userService.putUserProfile(res.locals.user.id, req.body, req.file);
			res.json({ user });
		} catch (error) {
			next(error);
		}
	}

	public async createDMChannel(req: Request & { params: { recipientID: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const channel = await this.channelService.createOrGetDMChannel({
				recipientIDs: [res.locals.user.id, req.params.recipientID],
				hasVideo: true,
				wantAccessToken: true,
				videoUsersFilter: videoUser => videoUser.user.id === res.locals.user.id
			});
			res.json({ channel });
		} catch (error) {
			next(error);
		}
	}

	public async getChannels(req: Request, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const channels = await this.channelService.getChannelsForUser(res.locals.user.id);
			res.json({ channels });
		} catch (error) {
			next(error);
		}
	}
}
