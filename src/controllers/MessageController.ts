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
}
