import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { inject, injectable } from 'tsyringe';

@injectable()
export class UserRoutes {
	private readonly userController: UserController;

	public constructor(@inject(UserController) _userController: UserController) {
		this.userController = _userController;
	}

	public routes(router: Router): void {
		router.post('/register', this.userController.registerUser.bind(this.userController));

		router.get('/verify', this.userController.verifyUserEmail.bind(this.userController));
	}
}
