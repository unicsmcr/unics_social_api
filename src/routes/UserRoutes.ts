import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { inject, injectable } from 'tsyringe';
import getUser from './middleware/getUser';
import isVerified from './middleware/isVerified';

@injectable()
export class UserRoutes {
	private readonly userController: UserController;

	public constructor(@inject(UserController) _userController: UserController) {
		this.userController = _userController;
	}

	public routes(router: Router): void {
		router.post('/register', this.userController.registerUser.bind(this.userController));

		router.get('/verify', this.userController.verifyUserEmail.bind(this.userController));

		router.post('/authenticate', this.userController.authenticate.bind(this.userController));

		router.get('/users/:id/profile', getUser, isVerified, this.userController.getUserProfile.bind(this.userController));

		router.put('/users/@me/profile', getUser, isVerified, this.userController.putUserProfile.bind(this.userController));
	}
}
