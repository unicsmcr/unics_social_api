import { sign, verify as _verify } from 'jsonwebtoken';
import { getConfig } from './config';
import { promisify } from 'util';

type Payload = Record<string, string>;

const verify = promisify(_verify);

export function generateJWT(payload: Payload): Promise<string> {
	// wouldn't play nice with promisify :(
	return new Promise((resolve, reject) => {
		sign(payload, getConfig().jwtSecret, { expiresIn: '3 days' }, (err, jwt) => {
			err ? reject(err) : resolve(jwt);
		});
	});
}

export async function verifyJWT(jwt: string): Promise<Payload> {
	const payload = (await verify(jwt, getConfig().jwtSecret)) as Payload;
	return payload;
}
