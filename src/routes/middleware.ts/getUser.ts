import { NextFunction } from 'express';
import { container } from 'tsyringe';
import { UserService } from '../../services/UserService';
import { User } from '../../entities/User';
import { verifyJWT } from '../../util/auth';

enum GetUserError {
	AuthorizationMissing = 'Missing authorization header',
	InvalidToken = 'Authorization token is invalid',
	UserNotFound = 'User not found'
}

export type AuthenticatedResponse = Response & { locals: { user: User } };

export default async function getUser(req: Request, res: Response, next: NextFunction) {
	const userService = container.resolve(UserService);
	const jwt = req.headers.get('authorization');
	if (!jwt) return next(new Error(GetUserError.AuthorizationMissing));
	let id: string;
	try {
		id = (await verifyJWT(jwt)).id;
	} catch (error) {
		return next(new Error(GetUserError.InvalidToken));
	}
	if (!id) return next(new Error(GetUserError.InvalidToken));
	const user = await userService.findOne({ id });
	if (!user) return next(new Error(GetUserError.UserNotFound));
	(res as AuthenticatedResponse).locals.user = user;
	next();
}
