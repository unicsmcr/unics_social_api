/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { load, EnvConfig, getConfig } from '../../../../src/util/config';

// Valid fixture
const fixture1: [Record<string, string>, EnvConfig] = [
	{
		PORT: '8000',
		LOG_ERRORS: 'true',
		HOST: 'https://kb.unicsmcr.com',
		DB_HOST: 'localhost',
		DB_PORT: '3306',
		DB_USER: 'root',
		DB_PASSWORD: 'password',
		DB_DATABASE: 'unics_social',
		SENDGRID_TOKEN: 'abc123',
		SENDGRID_FROM_EMAIL: 'noreply@unicsmcr.com',
		MOCK_EMAIL_SERVICE: 'false',
		JWT_SECRET: 'test123test',
		TWILIO_ACCOUNT_SID: 'ACX123',
		TWILIO_AUTH_TOKEN: 'TESTTOKEN',
		TWILIO_API_KEY: 'SK123',
		TWILIO_SECRET: 'asecret123',
		DISCORD_CLIENT_ID: 'a',
		DISCORD_CLIENT_SECRET: 'b',
		DISCORD_OAUTH2_SECRET: 'c',
		DISCORD_GUILD_ID: 'd'
	},
	{
		port: 8000,
		logErrors: true,
		host: 'https://kb.unicsmcr.com',
		db: {
			host: 'localhost',
			username: 'root',
			port: 3306,
			password: 'password',
			database: 'unics_social'
		},
		sendgrid: {
			token: 'abc123',
			fromEmail: 'noreply@unicsmcr.com',
			mock: false
		},
		twilio: {
			accountSid: 'ACX123',
			token: 'TESTTOKEN',
			apiKey: 'SK123',
			secret: 'asecret123'
		},
		discord: {
			clientID: 'a',
			clientSecret: 'b',
			oauth2Secret: 'c',
			guildID: 'd'
		},
		jwtSecret: 'test123test'
	}
];

// Valid fixture
const fixture2: [Record<string, string>, EnvConfig] = [
	{
		PORT: '25565',
		LOG_ERRORS: 'false',
		HOST: 'http://localhost:3000',
		DB_HOST: 'db',
		DB_PORT: '5432',
		DB_USER: 'unics_social',
		DB_PASSWORD: 'password',
		DB_DATABASE: 'unics_social',
		SENDGRID_TOKEN: 'token!!!',
		SENDGRID_FROM_EMAIL: 'test@gmail.com',
		MOCK_EMAIL_SERVICE: 'true',
		JWT_SECRET: 'asecret',
		TWILIO_ACCOUNT_SID: 'ACX5674567234',
		TWILIO_AUTH_TOKEN: 'token123',
		TWILIO_API_KEY: 'SKabc123',
		TWILIO_SECRET: 'secretabc123',
		DISCORD_CLIENT_ID: 'abc',
		DISCORD_CLIENT_SECRET: '123',
		DISCORD_OAUTH2_SECRET: 'def',
		DISCORD_GUILD_ID: '456'
	},
	{
		port: 25565,
		logErrors: false,
		host: 'http://localhost:3000',
		db: {
			host: 'db',
			username: 'unics_social',
			port: 5432,
			password: 'password',
			database: 'unics_social'
		},
		sendgrid: {
			token: 'token!!!',
			fromEmail: 'test@gmail.com',
			mock: true
		},
		twilio: {
			accountSid: 'ACX5674567234',
			token: 'token123',
			apiKey: 'SKabc123',
			secret: 'secretabc123'
		},
		discord: {
			clientID: 'abc',
			clientSecret: '123',
			oauth2Secret: 'def',
			guildID: '456'
		},
		jwtSecret: 'asecret'
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
