import { singleton } from 'tsyringe';
import { createHmac } from 'crypto';
import { getConfig } from '../util/config';
import { APIError } from '../util/errors';
import qs from 'querystring';

enum OAuthStateError {
	BadState = 'Invalid OAuth state',
	NotGenuine = 'OAuth state is not genuine'
}

@singleton()
export default class DiscordService {
	public generateOAuthState(userID: string) {
		const hmac = createHmac('sha256', getConfig().discord.oauthSecret)
			.update(userID)
			.digest('base64');
		return `${userID}:${hmac}`;
	}

	public parseOAuthState(state: string): string {
		const parts = state.split(':');
		if (parts.length !== 2) throw new APIError(400, OAuthStateError.BadState);
		const userID = parts[0];
		if (this.generateOAuthState(userID) !== state) throw new APIError(400, OAuthStateError.NotGenuine);
		return userID;
	}

	public generateAuthorizeURL(userID: string): string {
		const state = this.generateOAuthState(userID);
		return `https://discord.com/api/oauth2/authorize?${qs.encode({
			response_type: 'code',
			client_id: getConfig().discord.clientID,
			scope: 'identify guilds.join',
			state,
			redirect_uri: `${getConfig().host}/discord_oauth_verify`,
			prompt: 'none'
		})}`;
	}
}
