import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { getUser, isVerified } from './middleware';
import { MessageController } from '../controllers/MessageController';
import getChannel from './middleware/getChannel';
import { UserController } from '../controllers/UserController';

@injectable()
export class ChannelRoutes {
	private readonly messageController: MessageController;
	private readonly userController: UserController;

	public constructor(@inject(MessageController) messageController: MessageController, @inject(UserController) userController: UserController) {
		this.messageController = messageController;
		this.userController = userController;
	}

	public routes(router: Router): void {
		router.get('/channels', getUser, isVerified, this.userController.getChannels.bind(this.userController));
		router.post('/channels/:channelID/messages', getUser, isVerified, getChannel, this.messageController.createMessage.bind(this.messageController));
		router.get('/channels/:channelID/messages', getUser, isVerified, getChannel, this.messageController.getMessages.bind(this.messageController));
		router.get('/channels/:channelID/messages/:messageID', getUser, isVerified, this.messageController.getMessage.bind(this.messageController));
		router.delete('/channels/:channelID/messages/:messageID', getUser, isVerified, getChannel, this.messageController.deleteMessage.bind(this.messageController));
	}
}
