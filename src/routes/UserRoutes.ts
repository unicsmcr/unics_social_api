import { UserService } from '../services/UserService';
import { Router } from 'express';

export class UserRoutes {
	private readonly userService: UserService;

	public constructor() {
		this.userService = new UserService();
	}

	public routes(router: Router): void {
		router.post('/register', async (req, res, next) => {
			try {
				await this.userService.registerUser(req.body);
				return res.status(204).end();
			} catch (error) {
				next(error);
			}
		});

		router.get('/verify', async (req, res, next) => {
			try {
				await this.userService.verifyUser(req.query.confirmationId as string);
				return res.status(204).end();
			} catch (error) {
				next(error);
			}
		});
	}
}
