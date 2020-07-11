import 'reflect-metadata';
import { createConnection, getRepository } from 'typeorm';
import { User, AccountType, AccountStatus } from './entity/User';

createConnection({
	type: 'postgres',
	host: 'localhost',
	port: 5432,
	username: 'unics_social',
	password: 'password123',
	database: 'unics_social',
	entities: [
		User
	],
	synchronize: true,
	logging: false
}).then(async connection => {
	const repo = await connection.getRepository(User);
	const user = new User();
	user.forename = 'Amish';
	user.surname = 'Shah';
	user.accountType = AccountType.ADMIN;
	user.accountStatus = AccountStatus.VERIFIED;
	user.email = 'amishshah.2k@gmail.com';
	await repo.save(user);
}).catch(console.log);

