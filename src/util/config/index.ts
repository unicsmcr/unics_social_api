import { getEnv, intoNumber, intoBoolean } from './util';

export enum Environment {
	Dev = 'dev',
	Production = 'production'
}

export interface EnvConfig {
	port: number;
	logErrors: boolean;
	jwtSecret: string;
	db: {
		host: string;
		port: number;
		username: string;
		password: string;
		database: string;
	};
	sendgrid: {
		fromEmail: string;
		token: string;
		mock: boolean;
	};
}

export function load(source: Record<string, string | undefined> = process.env): EnvConfig {
	return {
		port: intoNumber(getEnv(source, 'PORT')),
		logErrors: intoBoolean(getEnv(source, 'LOG_ERRORS')),
		jwtSecret: getEnv(source, 'JWT_SECRET'),
		db: {
			host: getEnv(source, 'DB_HOST'),
			port: intoNumber(getEnv(source, 'DB_PORT')),
			username: getEnv(source, 'DB_USER'),
			password: getEnv(source, 'DB_PASSWORD'),
			database: getEnv(source, 'DB_DATABASE')
		},
		sendgrid: {
			fromEmail: getEnv(source, 'SENDGRID_FROM_EMAIL'),
			token: getEnv(source, 'SENDGRID_TOKEN'),
			mock: intoBoolean(getEnv(source, 'MOCK_EMAIL_SERVICE'))
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
