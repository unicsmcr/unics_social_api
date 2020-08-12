import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { inject, injectable } from 'tsyringe';
import { getUser, isVerified } from './middleware';

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

		router.get('/users/:id', getUser, isVerified, this.userController.getUser.bind(this.userController));

		router.put('/users/@me/profile', getUser, isVerified, this.userController.putUserProfile.bind(this.userController));

		router.post('/users/:recipientID/channel', getUser, isVerified, this.userController.createDMChannel.bind(this.userController));
	}
}
