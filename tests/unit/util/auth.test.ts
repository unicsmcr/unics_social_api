import { generateJWT, verifyJWT, TokenType } from '../../../src/util/auth';

describe('AuthUtil', () => {
	test('Payload can be signed then verified, removing any extra fields', async () => {
		const payload = { id: '1234567890abcdef', thisShouldBe: 'removed when generating the JWT', tokenType: TokenType.EmailVerify };
		const token = await generateJWT(payload);
		const reformedPayload = await verifyJWT(token) as any;
		expect(reformedPayload.id).toEqual(payload.id);
		expect(reformedPayload.thisShouldBe).toBeUndefined();
		expect(reformedPayload.tokenType).toEqual(payload.tokenType);
	});

	test('Throws when invalid JWT attempted to be verified', async () => {
		const payload = { id: '1234567890abcdef', tokenType: TokenType.EmailVerify };
		const token = await generateJWT(payload);
		await expect(verifyJWT(`${token}1`)).rejects.toThrow();
		await expect(verifyJWT(`1${token}`)).rejects.toThrow();
		await expect(verifyJWT(`12hsdfn93246u9n`)).rejects.toThrow();
	});
});
