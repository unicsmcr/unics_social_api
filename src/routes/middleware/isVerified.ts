import { NextFunction, Request } from 'express';
import { AuthenticatedResponse } from './getUser';
import { AccountStatus } from '../../entities/User';

enum VerifiedError {
	Unverified = 'You are unverified to use this endpoint - please confirm your email address.'
}

export default function isVerified(req: Request, res: AuthenticatedResponse, next: NextFunction) {
	if (res.locals.user.accountStatus !== AccountStatus.Verified) {
		return next(new Error(VerifiedError.Unverified));
	}
	next();
}
