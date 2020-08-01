import { singleton } from 'tsyringe';
import { getRepository, FindOneOptions, FindConditions } from 'typeorm';
import { Channel } from '../entities/Channel';

@singleton()
export default class ChannelService {
	public async findOne(findConditions: FindConditions<Channel>, options?: FindOneOptions) {
		return getRepository(Channel).findOne(findConditions, options);
	}
}
