import { createApp } from '../../src';

describe('app', () => {
	test('App is created with valid properties', async () => {
		await expect(createApp()).resolves.toBeTruthy();
	});
});
