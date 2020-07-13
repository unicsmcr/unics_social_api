import { generateJWT, verifyJWT } from '../../../src/util/auth';

describe('AuthUtil', () => {
	test('Payload can be signed then verified', async () => {
		const payload = { test: 'passes, hopefully' };
		const token = await generateJWT(payload);
		const reformedPayload = await verifyJWT(token);
		expect(reformedPayload).toMatchObject(payload);
	});

	test('Throws when invalid JWT attempted to be verified', async () => {
		const payload = { test: 'passes, hopefully' };
		const token = await generateJWT(payload);
		expect(verifyJWT(`${token}1`)).rejects.toThrow();
		expect(verifyJWT(`1${token}`)).rejects.toThrow();
		expect(verifyJWT(`12hsdfn93246u9n`)).rejects.toThrow();
	});
});
