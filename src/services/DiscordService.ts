import { singleton } from 'tsyringe';
import { createHmac } from 'crypto';
import { getConfig } from '../util/config';
import { APIError, HttpCode } from '../util/errors';
import qs from 'querystring';
import axios, { AxiosResponse } from 'axios';
import { getConnection } from 'typeorm';
import { Rest, TokenType } from '@spectacles/rest';
import { DiscordLink } from '../entities/DiscordLink';
import { Agent } from 'https';
import { logger } from '../util/logger';

enum OAuth2StateError {
	BadState = 'Invalid OAuth2 state',
	NotGenuine = 'OAuth2 state is not genuine'
}

enum LinkError {
	DiscordLinked = 'This discord account is linked to another user.',
	FailedToKick = 'Failed to remove the previous Discord account you had from the UniCS server.',
	FailedToAdd = 'Something went wrong when adding you to the Discord server.'
}

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

@singleton()
export default class DiscordService {
	private readonly agent: Agent;
	private readonly client: Rest;
	public constructor() {
		this.agent = new Agent({ keepAlive: true });
		this.client = new Rest(getConfig().discord.botToken, {
			tokenType: TokenType.BOT,
			agent: this.agent
		});
	}

	public generateOAuth2State(userID: string) {
		const hmac = createHmac('sha256', getConfig().discord.oauth2Secret)
			.update(userID)
			.digest('base64');
		return `${userID}:${hmac}`;
	}

	public get redirectURI() {
		return `${getConfig().host}/discord_link`;
	}

	public parseOAuth2State(state: string): string {
		const parts = state.split(':');
		if (parts.length !== 2) throw new APIError(400, OAuth2StateError.BadState);
		const userID = parts[0];
		if (this.generateOAuth2State(userID) !== state) throw new APIError(HttpCode.BadRequest, OAuth2StateError.NotGenuine);
		return userID;
	}

	public generateAuthorizeURL(userID: string): string {
		const state = this.generateOAuth2State(userID);
		return `https://discord.com/api/oauth2/authorize?${qs.encode({
			response_type: 'code',
			client_id: getConfig().discord.clientID,
			scope: 'identify guilds.join',
			state,
			redirect_uri: this.redirectURI,
			prompt: 'consent'
		})}`;
	}

	private async getToken(code: string): Promise<string> {
		const config = getConfig();
		const res: AxiosResponse<TokenResponse> = await axios.post(`https://discordapp.com/api/v6/oauth2/token`, qs.encode({
			client_id: config.discord.clientID,
			client_secret: config.discord.clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: this.redirectURI,
			scope: 'identify guilds.join'
		}));
		return res.data.access_token;
	}

	public async finaliseAccountLink(state: string, oauth2Code: string): Promise<void> {
		const userID = this.parseOAuth2State(state);
		const token = await this.getToken(oauth2Code);

		const client = new Rest({
			token,
			tokenType: TokenType.BEARER
		});
		const { id: discordID } = await client.get('/users/@me') as { id: string };

		return getConnection().transaction(async entityManager => {
			// Find any existing link for the KB user or for the Discord account
			const links = await entityManager.find(DiscordLink, {
				where: [
					{ discordID },
					{ user: { id: userID } }
				],
				relations: [
					'user'
				]
			});

			const existingUserLink = links.find(link => link.user.id === userID);
			const existingDiscordLink = links.find(link => link.discordID === discordID);

			if (existingDiscordLink && existingDiscordLink.user.id !== userID) {
				// The discord account already exists in the database, but it is linked to another user so we can't link this.
				throw new APIError(HttpCode.BadRequest, LinkError.DiscordLinked);
			}

			if (existingUserLink && existingUserLink.discordID !== discordID) {
				// The user already has a linked Discord account, but it is different to the new one. We can remove the old account.
				await this.client.delete(`/guilds/${getConfig().discord.guildID}/members/${existingUserLink.discordID}`).catch(error => {
					if (error.response?.status === HttpCode.NotFound) {
						// Failed because old user wasn't in server anyway - that's fine
						return Promise.resolve();
					}
					// Failed for some other reason - can't continue
					logger.warn(`Discord error: ${error.message as string|undefined ?? 'no message attached to error'}`);
					return Promise.reject(new APIError(HttpCode.InternalError, LinkError.FailedToKick));
				});
				await entityManager.update(DiscordLink, { id: existingUserLink.id }, { discordID });
			} else if (!existingUserLink) {
				// The user does not have any discord account linked, so make a new link!
				await entityManager.save(DiscordLink, { discordID, user: { id: userID } });
			}

			// Add the user to the Discord server
			const res = await this.client.put(`/guilds/${getConfig().discord.guildID}/members/${discordID}`, {
				access_token: token
			}).catch(error => {
				logger.warn(`Discord error: ${error.message as string|undefined ?? 'no message attached to error'}`);
				return Promise.reject(new APIError(500, LinkError.FailedToAdd));
			});
			console.log(res);
		});
	}
}
