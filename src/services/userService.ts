import { User } from '../entities/User';
import { getRepository } from 'typeorm';

type UserDataToCreate = Omit<User, 'id'>;
type UserDataOnlyIdReq = Partial<User> & Required<Pick<User, 'id'>>;

export class UserService {
	public async create(data: UserDataToCreate): Promise<User> {
		const user = new User();
		Object.assign(user, data);
		return getRepository(User).save(user);
	}

	public async update(data: UserDataOnlyIdReq) {
		const userRepo = getRepository(User);
		const user = await userRepo.findOneOrFail(data.id);
		Object.assign(user, data);
		return userRepo.save(user);
	}
}
