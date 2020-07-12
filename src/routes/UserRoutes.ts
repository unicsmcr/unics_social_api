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
				return res.status(204).end();
			} catch (error) {
				next(error);
			}
		});

		router.get('/verify', async (req, res, next) => {
			try {
				await this.userController.verifyUser(req.query.confirmationId as string);
				return res.status(204).end();
			} catch (error) {
				next(error);
			}
		});
	}
}
