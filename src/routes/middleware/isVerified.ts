import { NextFunction, Request, Response } from 'express';
import { AuthenticatedResponse } from './getUser';
import { AccountStatus } from '../../entities/User';
import { APIError, HttpCode } from '../../util/errors';

enum VerifiedError {
	Unverified = 'You are unverified to use this endpoint - please confirm your email address.'
}

export default function isVerified(req: Request, res: Response, next: NextFunction) {
	if (!res.locals.user) return next(new APIError(HttpCode.Unauthorized, VerifiedError.Unverified));
	if ((res as AuthenticatedResponse).locals.user.accountStatus !== AccountStatus.Verified) {
		return next(new APIError(HttpCode.Forbidden, VerifiedError.Unverified));
	}
	next();
}

