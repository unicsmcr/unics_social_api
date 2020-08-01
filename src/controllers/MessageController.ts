import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import MessageService from '../services/MessageService';
import { AccountType } from '../entities/User';
import { HttpCode } from '../util/errors';
import { ChannelResponse } from '../routes/middleware/getChannel';
import GatewayController from './GatewayController';
import { MessageCreateGatewayPacket, GatewayPacketType, MessageDeleteGatewayPacket } from '../util/gateway';
import { EventChannel } from '../entities/Channel';

@injectable()
export class MessageController {
	private readonly messageService: MessageService;
	private readonly gatewayController: GatewayController;

	public constructor(@inject(MessageService) messageService: MessageService, @inject(GatewayController) gatewayController: GatewayController) {
		this.messageService = messageService;
		this.gatewayController = gatewayController;
	}

	public async createMessage(req: Request, res: ChannelResponse, next: NextFunction): Promise<void> {
		try {
			const message = await this.messageService.createMessage({ ...req.body, channel: res.locals.channel, author: res.locals.user });
			if (res.locals.channel instanceof EventChannel) {
				await this.gatewayController.broadcast<MessageCreateGatewayPacket>({
					type: GatewayPacketType.MessageCreate,
					data: {
						message
					}
				});
			}
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
				page: Number(req.query.page),
				count: 50
			});
			res.json({ messages });
		} catch (error) {
			next(error);
		}
	}

	public async deleteMessage(req: Request & { params: { messageID: string } }, res: ChannelResponse, next: NextFunction): Promise<void> {
		try {
			await this.messageService.deleteMessage({
				id: req.params.messageID,
				channelID: res.locals.channel.id,
				authorID: res.locals.user.accountType === AccountType.Admin ? undefined : res.locals.user.id
			});
			if (res.locals.channel instanceof EventChannel) {
				await this.gatewayController.broadcast<MessageDeleteGatewayPacket>({
					type: GatewayPacketType.MessageDelete,
					data: {
						messageID: req.params.messageID,
						channelID: res.locals.channel.id
					}
				});
			}
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}
}
