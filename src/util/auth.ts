import { sign, verify as _verify } from 'jsonwebtoken';
import { getConfig } from './config';
import { promisify } from 'util';
import { User } from '../entities/User';
import { APIError, HttpCode } from './errors';
import { EmailVerifyError } from '../services/UserService';

export enum TokenType {
	Auth,
	PasswordReset,
	EmailVerify
}

type Payload = Pick<User, 'id'>;
const verify = promisify(_verify);

export function generateJWT(payload: Payload, TokenType: TokenType): Promise<string> {
	// wouldn't play nice with promisify :(
	return new Promise((resolve, reject) => {
		sign({ id: payload.id, TokenType: TokenType }, getConfig().jwtSecret, { expiresIn: '3 days' }, (err, jwt) => {
			err ? reject(err) : resolve(jwt);
		});
	});
}

export async function verifyJWT(jwt: string): Promise<Payload & TokenType> {
	try {
		const payload = (await verify(jwt, getConfig().jwtSecret)) as Payload & TokenType;
		return payload;
	} catch (e) {
		throw new APIError(HttpCode.BadRequest, EmailVerifyError.TokenNotFound);
	}
}
