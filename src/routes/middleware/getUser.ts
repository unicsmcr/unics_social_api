import { NextFunction, Response, Request } from 'express';
import { container } from 'tsyringe';
import { UserService } from '../../services/UserService';
import { User } from '../../entities/User';
import { verifyJWT } from '../../util/auth';
import { APIError, HttpResponseCode } from '../../util/errors';

enum GetUserError {
	AuthorizationMissing = 'Missing authorization header',
	InvalidToken = 'Authorization token is invalid',
	UserNotFound = 'User not found'
}

export type AuthenticatedResponse = Omit<Response, 'locals'> & { locals: { user: User } };

export default async function getUser(req: Request, res: Response, next: NextFunction) {
	const userService = container.resolve(UserService);
	const jwt = req.headers.authorization;
	if (!jwt) return next(new APIError(HttpResponseCode.Unauthorized, GetUserError.AuthorizationMissing));
	let id: string;
	try {
		id = (await verifyJWT(jwt)).id;
	} catch (error) {
		return next(new APIError(HttpResponseCode.Unauthorized, GetUserError.InvalidToken));
	}
	if (!id) return next(new APIError(HttpResponseCode.Unauthorized, GetUserError.InvalidToken));
	const user = await userService.findOne({ id });
	if (!user) return next(new APIError(HttpResponseCode.Unauthorized, GetUserError.UserNotFound));
	(res as AuthenticatedResponse).locals.user = user;
	next();
}
