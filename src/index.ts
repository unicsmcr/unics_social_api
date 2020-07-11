import 'reflect-metadata';

// Load variables from .env into process.env
import { config as loadEnv } from 'dotenv';
loadEnv();

import { createConnection } from 'typeorm';
import { getConfig } from './util/config';
import { User } from './entities/User';

export async function createApp() {
	await createConnection({
		type: 'postgres',
		...getConfig().db, // username, password, host, port, database
		entities: [
			User
		],
		synchronize: true,
		logging: false
	});
}
