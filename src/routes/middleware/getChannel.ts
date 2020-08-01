import { NextFunction, Request } from 'express';
import { Channel, EventChannel } from '../../entities/Channel';
import { APIError, HttpCode } from '../../util/errors';
import { AuthenticatedResponse } from './getUser';
import { container } from 'tsyringe';
import ChannelService from '../../services/ChannelService';

enum GetChannelError {
	NotAllowed = 'You are not allowed to view this channel',
	NotFound = 'Channel not found'
}

export type ChannelResponse = AuthenticatedResponse & { locals: { channel: Channel } };

export default async function getChannel(req: Request, res: AuthenticatedResponse, next: NextFunction) {
	const channelService = container.resolve(ChannelService);
	const channel = await channelService.findOne({ id: req.params.channelID });
	if (!channel) throw new APIError(HttpCode.NotFound, GetChannelError.NotFound);

	if (channel instanceof EventChannel) {
		(res as ChannelResponse).locals.channel = channel;
	}
	next();
}
