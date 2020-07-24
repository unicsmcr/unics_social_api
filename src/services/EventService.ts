import { singleton } from 'tsyringe';
import { Event } from '../entities/Event';
import { getRepository } from 'typeorm';
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

	public findAll(): Promise<Event[]> {
		return getRepository(Event).find();
	}
}
