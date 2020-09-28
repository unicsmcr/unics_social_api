import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const SECOND = 1e3;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const message: any = {
	error: 'You are being ratelimited! Try again in a few minutes.'
};

const keyGenerator = (req: Request) => {
	console.log(req.ip, req.headers);
	return req.ip;
};

export const registerRateLimit = rateLimit({
	windowMs: HOUR,
	max: 3,
	message,
	keyGenerator
});

export const sendMessageRateLimit = rateLimit({
	windowMs: 10 * SECOND,
	max: 10,
	message,
	keyGenerator
});

export const resendVerificationRateLimit = rateLimit({
	windowMs: 5 * MINUTE,
	max: 1,
	message,
	keyGenerator
});

export const forgotPasswordRateLimit = rateLimit({
	windowMs: 5 * MINUTE,
	max: 2,
	message,
	keyGenerator
});

export const reportRateLimit = rateLimit({
	windowMs: MINUTE,
	max: 3,
	message,
	keyGenerator
});

export const discordRateLimit = rateLimit({
	windowMs: MINUTE,
	max: 2,
	message,
	keyGenerator
});
