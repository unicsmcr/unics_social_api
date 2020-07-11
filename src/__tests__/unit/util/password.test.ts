import { hashPassword, verifyPassword } from '../../../util/password';

describe('password', () => {
	test('produces expected output', async () => {
		const password = 'password123!';
		const output = await hashPassword(password);

		// Make sure password is not stored in the output as plain text
		expect(output).not.toContain(password);

		// Make sure only the correct password can be verified
		expect(verifyPassword(password, output)).toStrictEqual(true);
		expect(verifyPassword('', output)).toStrictEqual(false);
		expect(verifyPassword('password', output)).toStrictEqual(false);
		expect(verifyPassword('password 123!', output)).toStrictEqual(false);
		expect(verifyPassword('password123!', ' ')).toStrictEqual(false);
	});

	test('two hashes produce different outputs', async () => {
		const password = 'passw0rd123';
		const [output1, output2] = await Promise.all([hashPassword(password), hashPassword(password)]);

		expect(output1).not.toEqual(output2);

		expect(verifyPassword(password, output1)).toStrictEqual(true);
		expect(verifyPassword(password, output2)).toStrictEqual(true);
	});
});
