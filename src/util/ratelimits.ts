import rateLimit from 'express-rate-limit';

const SECOND = 1e3;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const message: any = {
	error: 'You are being ratelimited! Try again in a few minutes.'
};

export const registerRateLimit = rateLimit({
	windowMs: HOUR,
	max: 3,
	message
});

export const sendMessageRateLimit = rateLimit({
	windowMs: 10 * SECOND,
	max: 10,
	message
});

export const resendVerificationRateLimit = rateLimit({
	windowMs: 5 * MINUTE,
	max: 1,
	message
});

export const forgotPasswordRateLimit = rateLimit({
	windowMs: 5 * MINUTE,
	max: 2,
	message
});

export const reportRateLimit = rateLimit({
	windowMs: MINUTE,
	max: 3,
	message
});

export const discordRateLimit = rateLimit({
	windowMs: MINUTE,
	max: 2,
	message
});
