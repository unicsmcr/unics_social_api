import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { getUser, isVerified } from './middleware';
import { MessageController } from '../controllers/MessageController';
import getChannel from './middleware/getChannel';
import { UserController } from '../controllers/UserController';
import { TokenType } from '../util/auth';

@injectable()
export class ChannelRoutes {
	private readonly messageController: MessageController;
	private readonly userController: UserController;

	public constructor(@inject(MessageController) messageController: MessageController, @inject(UserController) userController: UserController) {
		this.messageController = messageController;
		this.userController = userController;
	}

	public routes(router: Router): void {
		router.get('/channels', getUser(TokenType.Auth), isVerified, this.userController.getChannels.bind(this.userController) as any);
		router.post('/channels/:channelID/messages', getUser(TokenType.Auth), isVerified, getChannel as any, this.messageController.createMessage.bind(this.messageController) as any);
		router.get('/channels/:channelID/messages', getUser(TokenType.Auth), isVerified, getChannel as any, this.messageController.getMessages.bind(this.messageController) as any);
		router.get('/channels/:channelID/messages/:messageID', getUser(TokenType.Auth), isVerified, this.messageController.getMessage.bind(this.messageController) as any);
		router.delete('/channels/:channelID/messages/:messageID', getUser(TokenType.Auth), isVerified, getChannel as any, this.messageController.deleteMessage.bind(this.messageController) as any);
	}
}
