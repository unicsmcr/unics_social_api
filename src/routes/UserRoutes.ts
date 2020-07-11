import { UserController } from '../controllers/UserController';
import { Router } from 'express';

export class UserRoutes {
	private readonly userController: UserController;

	public constructor() {
		this.userController = new UserController();
	}

	public routes(router: Router): void {
		router.post('/register', async (req, res, next) => {
			try {
				await this.userController.registerUser(req.body);
				return res.json({
					user: null
				});
			} catch (error) {
				next(error);
			}
		});
	}
}
