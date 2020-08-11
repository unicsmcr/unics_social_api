import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { getUser, isVerified } from './middleware';
import { MessageController } from '../controllers/MessageController';
import getChannel from './middleware/getChannel';

@injectable()
export class ChannelRoutes {
	private readonly messageController: MessageController;

	public constructor(@inject(MessageController) messageController: MessageController) {
		this.messageController = messageController;
	}

	public routes(router: Router): void {
		router.post('/channels/:channelID/messages', getUser, isVerified, getChannel, this.messageController.createMessage.bind(this.messageController));
		router.get('/channels/:channelID/messages', getUser, isVerified, getChannel, this.messageController.getMessages.bind(this.messageController));
		router.get('/channels/:channelID/messages/:messageID', getUser, isVerified, this.messageController.getMessage.bind(this.messageController));
		router.delete('/channels/:channelID/messages/:messageID', getUser, isVerified, getChannel, this.messageController.deleteMessage.bind(this.messageController));
	}
}
