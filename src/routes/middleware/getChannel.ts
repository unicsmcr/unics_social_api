import { NextFunction, Request } from 'express';
import { Channel } from '../../entities/Channel';
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
	if (!req.params.channelID) return next(new APIError(HttpCode.NotFound, GetChannelError.NotFound));
	const channel = await channelService.findOne({ id: req.params.channelID });
	if (!channel) return next(new APIError(HttpCode.NotFound, GetChannelError.NotFound));
	(res as ChannelResponse).locals.channel = channel;
	next();
}
