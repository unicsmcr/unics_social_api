import 'reflect-metadata';

import EventService from '../../../src/services/EventService';
import { createDBConnection } from '../../../src';
import { Event, APIEvent } from '../../../src/entities/Event';
import events from '../../fixtures/events';
import { getConnection, getRepository } from 'typeorm';
import { HttpCode } from '../../../src/util/errors';


beforeAll(async () => {
	await createDBConnection();
});

afterEach(async () => {
	await getConnection().dropDatabase();
	await getConnection().synchronize();
});

const eventService = new EventService();

describe('EventService', () => {
	describe('createEvent', () => {
		const basePayload: Omit<APIEvent, 'id'> = Object.assign({ ...events[0] }, {
			...events[0].toJSON(),
			channel: undefined,
			id: undefined
		});

		test('Creates an event with valid details', async () => {
			const event = await eventService.createEvent(basePayload);
			expect({ ...basePayload, id: event.id, channelID: event.channelID }).toEqual(event);
			const repoEvent = await getRepository(Event).findOneOrFail(event.id);
			expect(repoEvent.toJSON()).toEqual(event);
		});

		test('Throws when title too long', async () => {
			const payload = { ...basePayload, title: 'b'.repeat(100) };
			await expect(eventService.createEvent(payload)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(Event).findOneOrFail()).rejects.toThrow();
		});

		test('Throws when description too long', async () => {
			const payload = { ...basePayload, description: 'b'.repeat(4000) };
			await expect(eventService.createEvent(payload)).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(getRepository(Event).findOneOrFail()).rejects.toThrow();
		});
	});

	describe('findAll', () => {
		test('Returns empty list when no events', async () => {
			await (expect(eventService.findAll())).resolves.toEqual([]);
		});

		test('Returns singleton list for 1 event', async () => {
			const savedEvents = [events[0]];
			await getRepository(Event).save(savedEvents);
			await (expect(eventService.findAll())).resolves.toEqual(savedEvents.map(event => event.toJSON()));
		});

		test('Returns 2 events when there are 2 events', async () => {
			const savedEvents = [events[0], events[1]];
			await getRepository(Event).save(savedEvents);
			await (expect(eventService.findAll())).resolves.toEqual(savedEvents.map(event => event.toJSON()));
		});

		test('Updates whenever events list is updated', async () => {
			await (expect(eventService.findAll())).resolves.toEqual([]);
			await getRepository(Event).save(events[0]);
			await (expect(eventService.findAll())).resolves.toEqual([events[0]].map(event => event.toJSON()));
			await getRepository(Event).save(events[1]);
			await (expect(eventService.findAll())).resolves.toEqual([events[0], events[1]].map(event => event.toJSON()));
			await getRepository(Event).remove(events[0]);
			await (expect(eventService.findAll())).resolves.toEqual([events[1]].map(event => event.toJSON()));
		});
	});

	describe('editEvent', () => {
		test('Edits event with valid data', async () => {
			const event = await getRepository(Event).save(events[0]);
			await eventService.editEvent({
				id: event.id,
				title: 'Test123'
			});
			expect({ ...event.toJSON(), title: 'Test123' }).toEqual((await getRepository(Event).findOneOrFail(events[0].id)).toJSON());
		});

		test('Multiple edits are persisted', async () => {
			const event = await getRepository(Event).save(events[0]);
			await eventService.editEvent({
				id: event.id,
				title: 'Test123'
			});
			expect({ ...event.toJSON(), title: 'Test123' }).toEqual((await getRepository(Event).findOneOrFail(events[0].id)).toJSON());
			await eventService.editEvent({
				id: event.id,
				title: 'Testing title',
				description: 'New description!'
			});
			expect({ ...event.toJSON(), title: 'Testing title', description: 'New description!' }).toEqual((await getRepository(Event).findOneOrFail(events[0].id)).toJSON());
		});

		test('Fails on invalid id/event not found', async () => {
			await expect(eventService.editEvent({ id: '', title: 'Test123' })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(eventService.findAll()).resolves.toEqual([]);
			await expect(eventService.editEvent({ id: '209d15de-57ba-4bb9-a9c9-e00042841b9b', title: 'Test123' })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(eventService.findAll()).resolves.toEqual([]);
		});

		test('Fails for invalid data (title too long)', async () => {
			const event = await getRepository(Event).save(events[0]);
			await expect(eventService.editEvent({ id: event.id, title: 'Test123'.repeat(50) })).rejects.toMatchObject({ httpCode: HttpCode.BadRequest });
			await expect(eventService.findAll()).resolves.toEqual([event.toJSON()]);
		});
	});
});
