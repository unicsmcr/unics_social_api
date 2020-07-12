import { createApp } from '../../src';
import '../util/dbTeardown';

describe('app', () => {
	test('App is created with valid properties', async () => {
		await expect(createApp()).resolves.toBeTruthy();
	});
});
