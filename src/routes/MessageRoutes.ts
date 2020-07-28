import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { getUser, isVerified } from './middleware';
import { MessageController } from '../controllers/MessageController';

@injectable()
export class MessageRoutes {
	private readonly messageController: MessageController;

	public constructor(@inject(MessageController) messageController: MessageController) {
		this.messageController = messageController;
	}

	public routes(router: Router): void {
		router.post('/channels/:channelID/messages', getUser, isVerified, this.messageController.createMessage.bind(this.messageController));
		router.get('/channels/:channelID/messages/:messageID', getUser, isVerified, this.messageController.getMessage.bind(this.messageController));
	}
}
