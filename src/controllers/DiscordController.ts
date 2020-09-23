import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import DiscordService from '../services/DiscordService';

@injectable()
export class DiscordController {
	private readonly discordService: DiscordService;

	public constructor(@inject(DiscordService) discordService: DiscordService) {
		this.discordService = discordService;
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
			const url = await this.discordService.finaliseAccountLink(req.body.state, req.body.code);
			res.json({
				url
			});
		} catch (error) {
			next(error);
		}
	}
}
