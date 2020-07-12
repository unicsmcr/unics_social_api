import { getConnection } from 'typeorm';

afterAll(async () => {
	await getConnection().dropDatabase();
	await getConnection().close();
});
