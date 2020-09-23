import { singleton } from 'tsyringe';
import { createHmac } from 'crypto';
import { getConfig } from '../util/config';
import { APIError } from '../util/errors';
import qs from 'querystring';
import axios, { AxiosResponse } from 'axios';
import { User } from '../entities/User';
import { getConnection } from 'typeorm';

enum OAuth2StateError {
	BadState = 'Invalid OAuth2 state',
	NotGenuine = 'OAuth2 state is not genuine'
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
		const userID = await this.parseOAuth2State(state);
		const accessToken = await this.getToken(oauth2Code);
	}
}
