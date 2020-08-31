import { singleton } from 'tsyringe';
import { Event, APIEvent } from '../entities/Event';
import { getRepository, getConnection } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { EventChannel } from '../entities/Channel';
import { formatValidationErrors, APIError, HttpCode } from '../util/errors';

type EventCreationData = Omit<APIEvent, 'id' | 'channelID'>;

enum PatchEventError {
	IdMissing = 'Event ID missing',
	EventNotFound = 'Event does not exist'
}

@singleton()
export default class EventService {
	public async createEvent(data: EventCreationData): Promise<APIEvent> {
		const event = new Event();
		const { title, description, startTime, endTime, external } = data;
		Object.assign(event, { title, description, startTime: new Date(startTime), endTime: new Date(endTime), external });
		await validateOrReject(event).catch(e => Promise.reject(formatValidationErrors(e)));
		const channel = new EventChannel();
		channel.event = event;
		event.channel = channel;
		return (await getRepository(Event).save(event)).toJSON();
	}

	public async findAll(): Promise<APIEvent[]> {
		return (await getRepository(Event).find()).map(event => event.toJSON());
	}

	public async editEvent(data: Pick<APIEvent, 'id'> & Partial<APIEvent>): Promise<APIEvent> {
		return getConnection().transaction(async entityManager => {
			if (!data.id) throw new APIError(HttpCode.BadRequest, PatchEventError.IdMissing);
			const event = await entityManager.findOneOrFail(Event, data.id).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PatchEventError.EventNotFound)));
			if (data.startTime) (data as any).startTime = new Date(data.startTime);
			if (data.endTime) (data as any).endTime = new Date(data.endTime);
			Object.assign(event, { ...data, channel: event.channel });
			await validateOrReject(event).catch(e => Promise.reject(formatValidationErrors(e)));
			return (await entityManager.save(event)).toJSON();
		});
	}
}
