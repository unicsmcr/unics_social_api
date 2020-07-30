import { NextFunction, Request, Response } from 'express';
import { AuthenticatedResponse } from './getUser';
import { AccountType } from '../../entities/User';
import { APIError, HttpResponseCode } from '../../util/errors';

enum AdminCheckError {
	NotAdmin = 'You are not authorised to use this endpoint.'
}

export default function isAdmin(req: Request, res: Response, next: NextFunction) {
	if (!res.locals.user) return next(new APIError(HttpResponseCode.Unauthorized, AdminCheckError.NotAdmin));
	if ((res as AuthenticatedResponse).locals.user.accountType !== AccountType.Admin) {
		return next(new APIError(HttpResponseCode.Forbidden, AdminCheckError.NotAdmin));
	}
	next();
}
