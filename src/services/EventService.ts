import { singleton } from 'tsyringe';
import { Event } from '../entities/Event';
import { getRepository, getConnection } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { formatValidationErrors } from '../util/errors';

type EventCreationData = Omit<Event, 'id'>;

enum PatchEventError {
	IdMissing = 'Event ID missing'
}

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

	public async patchEvent(data: Pick<Event, 'id'> & Partial<Event>): Promise<Event> {
		return getConnection().transaction(async entityManager => {
			if (!data.id) throw new Error(PatchEventError.IdMissing);
			const event = await entityManager.findOneOrFail(Event, data.id);
			Object.assign(event, data);
			await validateOrReject(event).catch(e => Promise.reject(formatValidationErrors(e)));
			return entityManager.save(event);
		});
	}
}
