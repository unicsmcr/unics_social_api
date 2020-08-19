import { sign, verify as _verify } from 'jsonwebtoken';
import { getConfig } from './config';
import { promisify } from 'util';
import { User } from '../entities/User';

export enum TokenType {
	Auth = 0,
	PasswordReset = 1,
	EmailVerify = 2
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

export async function verifyJWT(jwt: string): Promise<Payload> {
	const payload = (await verify(jwt, getConfig().jwtSecret)) as Payload;
	return payload;
}
