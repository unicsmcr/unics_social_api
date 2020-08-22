import { getConnection } from 'typeorm';
import { container } from 'tsyringe';
import GatewayController from '../../src/controllers/GatewayController';

afterAll(async () => {
	try {
		const connection = getConnection();
		await connection.dropDatabase();
		await connection.close();
	} catch (e) { }

	try {
		const gateway = container.resolve(GatewayController);
		gateway.teardown();
	} catch (e) { }
});
