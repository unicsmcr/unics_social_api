import 'reflect-metadata';

// Load variables from .env into process.env
import { config as loadEnv } from 'dotenv';
loadEnv();

import { createConnection } from 'typeorm';
import { User, AccountType, AccountStatus } from './entity/User';
import { getConfig } from './util/config';

createConnection({
	type: 'postgres',
	...getConfig().db, // username, password, host, port, database
	entities: [
		User
	],
	synchronize: true,
	logging: false
}).then(async connection => {
	console.log('connected!');
	const repo = await connection.getRepository(User);
	const user = new User();
	user.forename = 'John';
	user.surname = 'Doe';
	user.password = 'Test';
	user.accountType = AccountType.USER;
	user.accountStatus = AccountStatus.VERIFIED;
	user.email = 'tes1t@email.com';
	await repo.save(user);
	console.log('saved!');
}).catch(console.log);
