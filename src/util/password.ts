import { randomBytes as _randomBytes, createHash } from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(_randomBytes);

/*
	Passwords are stored in the database in the form
	`{hash} {salt}`

	where both hash and salt are base64 encoded
*/

export function verifyPassword(password: string, hashAndSalt: string) {
	const [storedHash, salt] = hashAndSalt.split(' ');
	const toHash = `${password}${salt}`;
	const hash = createHash('sha256').update(toHash).digest('base64');
	return storedHash === hash;
}

export async function hashPassword(password: string) {
	const salt = (await randomBytes(64)).toString('base64');
	const toHash = `${password}${salt}`;
	const hash = createHash('sha256').update(toHash).digest('base64');
	return `${hash} ${salt}`;
}
