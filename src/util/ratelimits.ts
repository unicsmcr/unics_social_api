import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { getConfig } from './config';

const SECOND = 1e3;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const message: any = {
	error: 'You are being ratelimited! Try again in a few minutes.'
};

const keyGenerator = (req: Request) => req.headers['cf-connecting-ip'] as string|undefined ?? req.ip;

export enum RateLimiter {
	Register,
	SendMessage,
	ResendVerificationEmail,
	ForgotPassword,
	Report,
	Discord
}

const RATELIMITERS = {
	[RateLimiter.Register]: rateLimit({
		windowMs: HOUR,
		max: 3,
		message,
		keyGenerator
	}),
	[RateLimiter.SendMessage]: rateLimit({
		windowMs: 10 * SECOND,
		max: 10,
		message,
		keyGenerator
	}),
	[RateLimiter.ResendVerificationEmail]: rateLimit({
		windowMs: 5 * MINUTE,
		max: 1,
		message,
		keyGenerator
	}),
	[RateLimiter.ForgotPassword]: rateLimit({
		windowMs: 5 * MINUTE,
		max: 2,
		message,
		keyGenerator
	}),
	[RateLimiter.Report]: rateLimit({
		windowMs: MINUTE,
		max: 3,
		message,
		keyGenerator
	}),
	[RateLimiter.Discord]: rateLimit({
		windowMs: MINUTE,
		max: 2,
		message,
		keyGenerator
	})
};

export const passThrough = (req: Request, res: Response, next: NextFunction) => next();

export function getRatelimiter(limiter: RateLimiter, force = false) {
	if (!getConfig().rateLimiting && !force) return passThrough;
	return RATELIMITERS[limiter];
}
