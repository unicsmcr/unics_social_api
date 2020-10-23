import { singleton } from 'tsyringe';
import { ITwilioService } from './TwilioService';

interface GenerateAccessTokenOptions {
	userId: string;
	roomId: string;
}

@singleton()
export class MockTwilioService implements ITwilioService {
	public teardown() {
		return undefined;
	}

	public async createRoom(roomId: string): Promise<string> {
		return Promise.resolve(roomId);
	}

	public async completeRoom(): Promise<void> {
		return Promise.resolve(undefined);
	}

	public generateAccessToken(options: GenerateAccessTokenOptions): string {
		return [options.roomId, options.userId, String(Date.now())].join('');
	}
}
