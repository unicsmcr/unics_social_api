import 'reflect-metadata';

// Load variables from .env into process.env
import { config as loadEnv } from 'dotenv';
loadEnv();

import express from 'express';

import { createConnection } from 'typeorm';
import { getConfig } from './util/config';
import { User } from './entities/User';

export function createExpress() {
	const app = express();
	// to-do register routes
	return app;
}

export function createDBConnection() {
	return createConnection({
		type: 'postgres',
		...getConfig().db, // username, password, host, port, database
		entities: [
			User
		],
		synchronize: true,
		logging: false
	});
}

export async function createApp() {
	const app = createExpress();
	await createDBConnection();
	return app;
}
