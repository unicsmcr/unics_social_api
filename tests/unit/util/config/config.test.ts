/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { load, EnvConfig, getConfig } from '../../../../src/util/config';

// Valid fixture
const fixture1: [Record<string, string>, EnvConfig] = [
	{
		PORT: '8000',
		LOG_ERRORS: 'true',
		DB_HOST: 'localhost',
		DB_PORT: '3306',
		DB_USER: 'root',
		DB_PASSWORD: 'password',
		DB_DATABASE: 'unics_social'
	},
	{
		port: 8000,
		logErrors: true,
		db: {
			host: 'localhost',
			username: 'root',
			port: 3306,
			password: 'password',
			database: 'unics_social'
		}
	}
];

// Valid fixture
const fixture2: [Record<string, string>, EnvConfig] = [
	{
		PORT: '25565',
		LOG_ERRORS: 'false',
		DB_HOST: 'db',
		DB_PORT: '5432',
		DB_USER: 'unics_social',
		DB_PASSWORD: 'password',
		DB_DATABASE: 'unics_social'
	},
	{
		port: 25565,
		logErrors: false,
		db: {
			host: 'db',
			username: 'unics_social',
			port: 5432,
			password: 'password',
			database: 'unics_social'
		}
	}
];

describe('load config', () => {
	test('Valid env fixtures load correctly', () => {
		// Test it works when passing in the variables as a param
		expect(load(fixture1[0])).toEqual(fixture1[1]);
		// Test it works with environment variables
		Object.assign(process.env, fixture2[0]);
		expect(load()).toEqual(fixture2[1]);
	});

	test('Throws for missing values', () => {
		for (const envKey of Object.keys(fixture1[0])) {
			const fixture = { ...fixture1[0] };
			delete fixture[envKey];
			expect(() => load(fixture)).toThrow();
		}
	});
});


describe('getConfig', () => {
	test('Caching', () => {
		let config = getConfig(fixture1[0]);
		expect(config).toEqual(fixture1[1]);
		expect(getConfig({ ...fixture1[0], PORT: '25565' })).toStrictEqual(config);
		const oldConfig = { ...config };
		config = getConfig({ ...fixture1[0], PORT: '25565' }, true);
		expect(config).not.toEqual(oldConfig);
		expect(getConfig({ ...fixture1[0], PORT: '25565' })).toStrictEqual(config);
		expect(getConfig({ ...fixture1[0], PORT: '80' })).toStrictEqual(config);
	});
});
