import { injectable, inject } from 'tsyringe';
import { UserService } from './UserService';

@injectable()
export default class GatewayService {
	private readonly userService: UserService;

	public constructor(@inject(UserService) userService: UserService) {
		this.userService = userService;
	}
}
