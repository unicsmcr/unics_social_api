import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import MessageService from '../services/MessageService';

@injectable()
export class MessageController {
	private readonly messageService: MessageService;

	public constructor(@inject(MessageService) messageService: MessageService) {
		this.messageService = messageService;
	}

	public async createMessage(req: Request & { params: { channelID: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const message = await this.messageService.createMessage({ ...req.body, channelID: req.params.channelID, authorID: res.locals.user.id });
			res.json({ message });
		} catch (error) {
			next(error);
		}
	}

	public async getMessage(req: Request & { params: { channelID: string; messageID: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const message = await this.messageService.getMessage({ id: req.params.messageID, channelID: req.params.channelID });
			res.json({ message });
		} catch (error) {
			next(error);
		}
	}

	public async getMessages(req: Request & { params: { channelID: string; page: number } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const messages = await this.messageService.getMessages({
				channelID: req.params.channelID,
				page: Number(req.query.page)
			});
			res.json({ messages });
		} catch (error) {
			next(error);
		}
	}
}
