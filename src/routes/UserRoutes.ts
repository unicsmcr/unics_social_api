import { UserController } from '../controllers/UserController';
import { Router } from 'express';
import { AccountStatus, AccountType } from '../entities/User';

export class UserRoutes {
	private readonly userController: UserController;

	public constructor() {
		this.userController = new UserController();
	}

	public routes(router: Router): void {
		router.post('/register', async (req, res, next) => {
			try {
				const user = await this.userController.create({
					...req.body,
					accountStatus: AccountStatus.Unverified,
					accountType: AccountType.User
				});
				return res.json({
					user
				});
			} catch (error) {
				next(error);
			}
		});
	}
}
