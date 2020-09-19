import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import MessageService from '../services/MessageService';
import { AccountType } from '../entities/User';
import { HttpCode } from '../util/errors';
import { ChannelResponse } from '../routes/middleware/getChannel';
import GatewayController from './GatewayController';
import { MessageCreateGatewayPacket, GatewayPacketType, MessageDeleteGatewayPacket } from '../util/gateway';
import { EventChannel, DMChannel } from '../entities/Channel';

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
			const message = await this.messageService.createMessage({ ...req.body, channel: res.locals.channel, author: res.locals.user, time: new Date() });
			const gatewayPayload: MessageCreateGatewayPacket = {
				type: GatewayPacketType.MessageCreate,
				data: {
					message
				}
			};
			if (res.locals.channel instanceof EventChannel) {
				await this.gatewayController.broadcast<MessageCreateGatewayPacket>(gatewayPayload);
			} else if (res.locals.channel instanceof DMChannel) {
				await this.gatewayController.sendMessage<MessageCreateGatewayPacket>(res.locals.channel.users.map(user => user.id), gatewayPayload);
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

	public async getMessages(req: Request & { params: { channelID: string }; query: { before: string } }, res: ChannelResponse, next: NextFunction): Promise<void> {
		try {
			const messages = await this.messageService.getMessages({
				channel: res.locals.channel,
				before: new Date(req.query.before),
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
			const gatewayPayload: MessageDeleteGatewayPacket = {
				type: GatewayPacketType.MessageDelete,
				data: {
					messageID: req.params.messageID,
					channelID: res.locals.channel.id
				}
			};
			if (res.locals.channel instanceof EventChannel) {
				await this.gatewayController.broadcast<MessageDeleteGatewayPacket>(gatewayPayload);
			} else if (res.locals.channel instanceof DMChannel) {
				await this.gatewayController.sendMessage<MessageDeleteGatewayPacket>(res.locals.channel.users.map(user => user.id), gatewayPayload);
			}
			res.status(HttpCode.NoContent).end();
		} catch (error) {
			next(error);
		}
	}
}
