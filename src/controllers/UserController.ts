import { User } from '../entities/User';
import { getRepository } from 'typeorm';

type UserDataToCreate = Omit<User, 'id'>;
type UserDataOnlyIdReq = Partial<User> & Required<Pick<User, 'id'>>;

export class UserController {
	public async create(data: UserDataToCreate, shouldValidate = true): Promise<User> {
		const user = new User();
		Object.assign(user, data);
		if (shouldValidate) {
			/*
				to-do
				in this section, the user should be validated, e.g.:
					- is their password long enough
					- is their email a student.manchester.ac.uk email
					- is their name a "real" name?
			*/
		}
		return getRepository(User).save(user);
	}

	public async update(data: UserDataOnlyIdReq) {
		const userRepo = getRepository(User);
		const user = await userRepo.findOneOrFail(data.id);
		Object.assign(user, data);
		return userRepo.save(user);
	}
}
