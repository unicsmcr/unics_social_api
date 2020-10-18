import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { inject, injectable } from 'tsyringe';
import { getUser, isVerified, uploadImg } from './middleware';
import { TokenType } from '../util/auth';
import { DiscordController } from '../controllers/DiscordController';
import { getRatelimiter, RateLimiter } from '../util/ratelimits';

@injectable()
export class UserRoutes {
	private readonly userController: UserController;
	private readonly discordController: DiscordController;

	public constructor(@inject(UserController) userController: UserController, @inject(DiscordController) discordController: DiscordController) {
		this.userController = userController;
		this.discordController = discordController;
	}

	public routes(router: Router): void {
		router.post('/register', getRatelimiter(RateLimiter.Register), this.userController.registerUser.bind(this.userController));

		router.get('/verify', getUser(TokenType.EmailVerify), this.userController.verifyUserEmail.bind(this.userController));

		router.post('/resendVerificationEmail', getRatelimiter(RateLimiter.ResendVerificationEmail), this.userController.resendVerificationEmail.bind(this.userController));

		router.post('/authenticate', this.userController.authenticate.bind(this.userController));

		router.post('/forgot_password', getRatelimiter(RateLimiter.ForgotPassword), this.userController.forgotPassword.bind(this.userController));

		router.post('/reset_password', getUser(TokenType.PasswordReset), this.userController.resetPassword.bind(this.userController));

		router.get('/users', getUser(TokenType.Auth), isVerified, this.userController.getPublicUsers.bind(this.userController));

		router.get('/users/:id', getUser(TokenType.Auth), isVerified, this.userController.getUser.bind(this.userController));

		router.get('/users/@me/notes', getUser(TokenType.Auth), isVerified, this.userController.getNotes.bind(this.userController));

		router.put('/users/@me/notes/:id', getUser(TokenType.Auth), isVerified, this.userController.createNote.bind(this.userController));

		router.delete('/users/@me/notes/:id', getUser(TokenType.Auth), isVerified, this.userController.deleteNote.bind(this.userController));

		router.post('/users/:id/report', getRatelimiter(RateLimiter.Report), getUser(TokenType.Auth), isVerified, this.userController.reportUser.bind(this.userController));

		router.put('/users/@me/profile', getUser(TokenType.Auth), isVerified, uploadImg('avatar'), this.userController.putUserProfile.bind(this.userController));

		router.get('/users/@me/discord/authorize', getUser(TokenType.Auth), isVerified, this.discordController.getOAuth2AuthorizeURL.bind(this.discordController));

		router.post('/users/@me/discord/link', getRatelimiter(RateLimiter.Discord), getUser(TokenType.Auth), this.discordController.linkAccount.bind(this.discordController));

		router.post('/users/:recipientID/channel', getUser(TokenType.Auth), isVerified, this.userController.createDMChannel.bind(this.userController));
	}
}
