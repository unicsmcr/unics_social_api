import { singleton } from 'tsyringe';
import { createHmac } from 'crypto';
import { getConfig } from '../util/config';
import { APIError } from '../util/errors';
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
		return `${getConfig().host}/discord_oauth2_verify`;
	}

	public parseOAuth2State(state: string): string {
		const parts = state.split(':');
		if (parts.length !== 2) throw new APIError(400, OAuth2StateError.BadState);
		const userID = parts[0];
		if (this.generateOAuth2State(userID) !== state) throw new APIError(400, OAuth2StateError.NotGenuine);
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
			prompt: 'none'
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
			// Link the accounts
			await entityManager.createQueryBuilder()
				.insert()
				.into(DiscordLink)
				.values({
					discordID,
					user: { id: userID }
				})
				.onConflict(`("userId") DO UPDATE SET "discordID" = :discordID`)
				.setParameter('discordID', discordID)
				.execute()
				.catch(() => Promise.reject(new APIError(400, LinkError.DiscordLinked)));

			// Add the user to the Discord server
			await this.client.put(`/guilds/${getConfig().discord.guildID}/members/${discordID}`, {
				access_token: token
			}).catch(error => {
				logger.warn('Discord error:');
				logger.warn(error);
				return Promise.reject(new APIError(500, LinkError.FailedToAdd));
			});
		});
	}
}
