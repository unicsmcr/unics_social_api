import { singleton } from 'tsyringe';
import { Event } from '../entities/Event';
import { getRepository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { formatValidationErrors } from '../util/errors';

type EventCreationData = Omit<Event, 'id'>;

@singleton()
export default class EventService {
	public async createEvent(data: EventCreationData): Promise<Event> {
		const event = new Event();
		const { title, description, startTime, endTime, external } = data;
		Object.assign(event, { title, description, startTime, endTime, external });
		await validateOrReject(event).catch(e => Promise.reject(formatValidationErrors(e)));
		return getRepository(Event).save(event);
	}

	public find(options?: FindManyOptions<Event>): Promise<Event[]> {
		return getRepository(Event).find(options);
	}

	public findOne(findConditions: FindConditions<Event>, options?: FindOneOptions) {
		return getRepository(Event).findOne(findConditions, options);
	}
}
