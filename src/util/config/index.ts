import { getEnv, intoNumber } from './util';

export enum Environment {
	Dev = 'dev',
	Production = 'production'
}

export interface EnvConfig {
	port: number;
	db: {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
	};
}

export function load(source: Record<string, string | undefined> = process.env): EnvConfig {
	return {
		port: intoNumber(getEnv(source, 'PORT')),
		db: {
			host: getEnv(source, 'DB_HOST'),
			port: intoNumber(getEnv(source, 'DB_PORT')),
			user: getEnv(source, 'DB_USER'),
			password: getEnv(source, 'DB_PASSWORD'),
			database: getEnv(source, 'DB_DATABASE')
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

