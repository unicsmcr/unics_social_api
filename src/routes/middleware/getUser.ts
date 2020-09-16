import { NextFunction, Response, Request } from 'express';
import { container } from 'tsyringe';
import { UserService } from '../../services/UserService';
import { User } from '../../entities/User';
import { verifyJWT, TokenType, CombinedEnum } from '../../util/auth';
import { APIError, HttpCode } from '../../util/errors';

enum GetUserError {
	AuthorizationMissing = 'Missing authorization header',
	InvalidToken = 'Authorization token is invalid',
	UserNotFound = 'User not found',
	TokenMismatch = 'Given token not privileged for this request'
}

export type AuthenticatedResponse = Omit<Response, 'locals'> & { locals: { user: User; type: TokenType } };

export default function getUser(tokenType: TokenType) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const userService = container.resolve(UserService);
		const jwt = req.headers.authorization;
		if (!jwt) return next(new APIError(HttpCode.Unauthorized, GetUserError.AuthorizationMissing));
		let id: string;
		let type: TokenType;
		try {
			const token = await verifyJWT(jwt);
			id = (token).id;
			type = (token).tokenType;
		} catch (error) {
			return next(new APIError(HttpCode.Unauthorized, GetUserError.InvalidToken));
		}
		if (tokenType !== type) return next(new APIError(HttpCode.Unauthorized, GetUserError.TokenMismatch));
		if (!id) return next(new APIError(HttpCode.Unauthorized, GetUserError.InvalidToken));
		const user = await userService.findOne({ id });
		if (!user) return next(new APIError(HttpCode.Unauthorized, GetUserError.UserNotFound));
		(res as AuthenticatedResponse).locals.user = user;
		(res as AuthenticatedResponse).locals.type = tokenType;
		next();
	};
}
