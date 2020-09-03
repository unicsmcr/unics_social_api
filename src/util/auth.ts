import { sign, verify as _verify } from 'jsonwebtoken';
import { getConfig } from './config';
import { promisify } from 'util';
import { User } from '../entities/User';
import { APIError, HttpCode } from './errors';

export enum TokenType {
	Auth,
	PasswordReset,
	EmailVerify
}

enum AuthError {
	InvalidToken = 'Authorization token is invalid'
}

type Payload = Pick<User, 'id'> & {tokenType: TokenType};
const verify = promisify(_verify);

export function generateJWT(payload: Payload): Promise<string> {
	// wouldn't play nice with promisify :(
	return new Promise((resolve, reject) => {
		sign({ id: payload.id, tokenType: payload.tokenType }, getConfig().jwtSecret, { expiresIn: '3 days' }, (err, jwt) => {
			err ? reject(err) : resolve(jwt);
		});
	});
}

export async function verifyJWT(jwt: string): Promise<Payload> {
	try {
		const payload = (await verify(jwt, getConfig().jwtSecret)) as Payload;
		return payload;
	} catch (error) {
		throw new APIError(HttpCode.BadRequest, AuthError.InvalidToken);
	}
}
