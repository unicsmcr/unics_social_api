import { getEnv, intoNumber, intoBoolean } from './util';

export enum Environment {
	Dev = 'dev',
	Production = 'production'
}

export interface EnvConfig {
	port: number;
	logErrors: boolean;
	host: string;
	jwtSecret: string;
	db: {
		host: string;
		port: number;
		username: string;
		password: string;
		database: string;
	};
	email: {
		fromEmail: string;
		reportsEmail: string;
		config: string;
		mock: boolean;
	};
	twilio: {
		accountSid: string;
		token: string;
		secret: string;
		apiKey: string;
	};
	discord: {
		oauth2Secret: string;
		clientID: string;
		clientSecret: string;
		guildID: string;
		botToken: string;
		verifiedRole: string;
	};
}

export function load(source: Record<string, string | undefined> = process.env): EnvConfig {
	return {
		port: intoNumber(getEnv(source, 'PORT')),
		logErrors: intoBoolean(getEnv(source, 'LOG_ERRORS')),
		host: getEnv(source, 'HOST'),
		jwtSecret: getEnv(source, 'JWT_SECRET'),
		db: {
			host: getEnv(source, 'DB_HOST'),
			port: intoNumber(getEnv(source, 'DB_PORT')),
			username: getEnv(source, 'DB_USER'),
			password: getEnv(source, 'DB_PASSWORD'),
			database: getEnv(source, 'DB_DATABASE')
		},
		email: {
			fromEmail: getEnv(source, 'EMAIL_FROM_EMAIL'),
			reportsEmail: getEnv(source, 'EMAIL_REPORTS_EMAIL'),
			config: getEnv(source, 'EMAIL_CONFIG'),
			mock: intoBoolean(getEnv(source, 'MOCK_EMAIL_SERVICE'))
		},
		twilio: {
			accountSid: getEnv(source, 'TWILIO_ACCOUNT_SID'),
			token: getEnv(source, 'TWILIO_AUTH_TOKEN'),
			apiKey: getEnv(source, 'TWILIO_API_KEY'),
			secret: getEnv(source, 'TWILIO_SECRET')
		},
		discord: {
			clientID: getEnv(source, 'DISCORD_CLIENT_ID'),
			clientSecret: getEnv(source, 'DISCORD_CLIENT_SECRET'),
			oauth2Secret: getEnv(source, 'DISCORD_OAUTH2_SECRET'),
			guildID: getEnv(source, 'DISCORD_GUILD_ID'),
			botToken: getEnv(source, 'DISCORD_BOT_TOKEN'),
			verifiedRole: getEnv(source, 'DISCORD_VERIFIED_ROLE_ID')
		}
	};
}

let globalConfig: EnvConfig|undefined;

export function getConfig(source?: Record<string, string | undefined>, refresh = false): EnvConfig {
	if (globalConfig && refresh) {
		globalConfig = Object.assign(globalConfig, load(source));
	} else if (!globalConfig) {
		globalConfig = load(source);
	}
	return globalConfig;
}
