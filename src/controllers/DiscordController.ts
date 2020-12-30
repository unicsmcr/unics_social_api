import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import DiscordService from '../services/DiscordService';
import { APIError, HttpCode } from '../util/errors';

enum GetUserError {
	UserNotFound = 'User not found',
}

@injectable()
export class DiscordController {
	private readonly discordService: DiscordService;

	public constructor(@inject(DiscordService) discordService: DiscordService) {
		this.discordService = discordService;
	}

	public async getDiscordUser(req: Request & { params: { id: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			if (!req.params.id) throw new APIError(HttpCode.NotFound, GetUserError.UserNotFound);
			const link = await this.discordService.fetch(req.params.id);
			if (!link) throw new APIError(HttpCode.NotFound, GetUserError.UserNotFound);
			res.json(link);
		} catch (error) {
			next(error);
		}
	}

	public async getOAuth2AuthorizeURL(req: Request, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const url = await this.discordService.generateAuthorizeURL(res.locals.user.id);
			res.json({
				url
			});
		} catch (error) {
			next(error);
		}
	}

	public async linkAccount(req: Omit<Request, 'body'> & { body: { code: string; state: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			await this.discordService.finaliseAccountLink(req.body.state, req.body.code);
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}
}
