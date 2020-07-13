import { generateJWT, verifyJWT } from '../../../src/util/auth';

describe('AuthUtil', () => {
	test('Payload can be signed then verified, removing any extra fields', async () => {
		const payload = { id: '1234567890abcdef', thisShouldBe: 'removed when generating the JWT' };
		const token = await generateJWT(payload);
		const reformedPayload = await verifyJWT(token) as any;
		expect(reformedPayload.id).toEqual(payload.id);
		expect(reformedPayload.thisShouldBe).toBeUndefined();
	});

	test('Throws when invalid JWT attempted to be verified', async () => {
		const payload = { id: '1234567890abcdef' };
		const token = await generateJWT(payload);
		expect(verifyJWT(`${token}1`)).rejects.toThrow();
		expect(verifyJWT(`1${token}`)).rejects.toThrow();
		expect(verifyJWT(`12hsdfn93246u9n`)).rejects.toThrow();
	});
});
