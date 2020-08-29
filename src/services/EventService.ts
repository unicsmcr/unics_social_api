import { singleton } from 'tsyringe';
import { Event, APIEvent } from '../entities/Event';
import { getRepository, getConnection } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { EventChannel } from '../entities/Channel';
import { formatValidationErrors, APIError, HttpCode } from '../util/errors';
import sharp from 'sharp';
import { writeFile as _writeFile, unlink as _unlink } from 'fs';
import { promisify } from 'util';

const writeFile = promisify(_writeFile);
const unlink = promisify(_unlink);

type EventCreationData = Omit<APIEvent, 'id' | 'channelID' | 'image'> & { image: string|boolean };

enum PatchEventError {
	IdMissing = 'Event ID missing',
	EventNotFound = 'Event does not exist',
	InvalidImage = 'File must be an image.'
}

@singleton()
export default class EventService {
	public async uploadImage(image: string|boolean, event: Event, file?: Express.Multer.File): Promise<Event> {
		const unsetImage = typeof image === 'boolean' ? !image : image === 'false';

		// If there is an image, try to process it
		let processedImage: Buffer|undefined;
		if (!unsetImage && file?.buffer && file.buffer.length > 0) {
			processedImage = await sharp(file.buffer)
				.resize({ width: 800, height: 800, fit: sharp.fit.contain })
				.png()
				.toBuffer()
				.catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PatchEventError.InvalidImage)));
			event.image = true;
		} else if (unsetImage) {
			await unlink(`./assets/${event.id}.png`).catch(() => Promise.resolve());
			event.image = false;
		}

		if (processedImage) {
			await writeFile(`./assets/${event.id}.png`, processedImage);
		}
		return (event);
	}


	public async createEvent(data: EventCreationData, file?: Express.Multer.File): Promise<APIEvent> {
		const event = new Event();
		const { title, description, startTime, endTime, external } = data;
		Object.assign(event, { title, description, startTime: new Date(startTime), endTime: new Date(endTime), external });
		await validateOrReject(event).catch(e => Promise.reject(formatValidationErrors(e)));
		const channel = new EventChannel();
		channel.event = event;
		event.channel = channel;

		event.image = (await this.uploadImage(data.image, event, file)).image;

		return (await getRepository(Event).save(event)).toJSON();
	}

	public async findAll(): Promise<APIEvent[]> {
		return (await getRepository(Event).find()).map(event => event.toJSON());
	}

	public async editEvent(data: Pick<Event, 'id'> & Partial<Event> & { image: string|boolean }, file?: Express.Multer.File): Promise<APIEvent> {
		return getConnection().transaction(async entityManager => {
			if (!data.id) throw new APIError(HttpCode.BadRequest, PatchEventError.IdMissing);
			const event = await entityManager.findOneOrFail(Event, data.id).catch(() => Promise.reject(new APIError(HttpCode.BadRequest, PatchEventError.EventNotFound)));
			Object.assign(event, { ...data, channel: event.channel });
			await validateOrReject(event).catch(e => Promise.reject(formatValidationErrors(e)));

			event.image = (await this.uploadImage(data.image, event, file)).image;

			return (await entityManager.save(event)).toJSON();
		});
	}
}
