import { singleton } from 'tsyringe';
import { createHmac } from 'crypto';
import { getConfig } from '../util/config';
import { APIError } from '../util/errors';
import qs from 'querystring';

enum OAuth2StateError {
	BadState = 'Invalid OAuth2 state',
	NotGenuine = 'OAuth2 state is not genuine'
}

@singleton()
export default class DiscordService {
	public generateOAuth2State(userID: string) {
		const hmac = createHmac('sha256', getConfig().discord.oauth2Secret)
			.update(userID)
			.digest('base64');
		return `${userID}:${hmac}`;
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
			redirect_uri: `${getConfig().host}/discord_oauth2_verify`,
			prompt: 'none'
		})}`;
	}
}
