import 'reflect-metadata';

import EventService from '../../../src/services/EventService';
import { createDBConnection } from '../../../src';
import { Event } from '../../../src/entities/Event';
import events from '../../fixtures/events';
import { getConnection, getRepository } from 'typeorm';
import '../../util/dbTeardown';

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
		const basePayload: Omit<Event, 'id'> = Object.assign({ ...events[0] }, { ...events[0], id: undefined });

		test('Registers a user with valid details', async () => {
			const event = await eventService.createEvent(basePayload);
			expect({ ...basePayload, id: event.id }).toEqual(event);
			await expect(getRepository(Event).findOne(event.id)).resolves.toEqual(event);
		});

		test('Throws when title too long', async () => {
			const payload = { ...basePayload, title: 'b'.repeat(100) };
			await expect(eventService.createEvent(payload)).rejects.toMatchObject({ httpCode: 400 });
			await expect(getRepository(Event).findOneOrFail()).rejects.toThrow();
		});

		test('Throws when description too long', async () => {
			const payload = { ...basePayload, description: 'b'.repeat(4000) };
			await expect(eventService.createEvent(payload)).rejects.toMatchObject({ httpCode: 400 });
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
			await (expect(eventService.findAll())).resolves.toEqual(savedEvents);
		});

		test('Returns 2 events when there are 2 events', async () => {
			const savedEvents = [events[0], events[1]];
			await getRepository(Event).save(savedEvents);
			await (expect(eventService.findAll())).resolves.toEqual(savedEvents);
		});

		test('Updates whenever events list is updated', async () => {
			await (expect(eventService.findAll())).resolves.toEqual([]);
			await getRepository(Event).save(events[0]);
			await (expect(eventService.findAll())).resolves.toEqual([events[0]]);
			await getRepository(Event).save(events[1]);
			await (expect(eventService.findAll())).resolves.toEqual([events[0], events[1]]);
			await getRepository(Event).remove(events[0]);
			await (expect(eventService.findAll())).resolves.toEqual([events[1]]);
		});
	});

	describe('patchEvent', () => {
		test('Edits event with valid data', async () => {
			const event = await getRepository(Event).save(events[0]);
			await eventService.patchEvent({
				id: event.id,
				title: 'Test123'
			});
			expect({ ...event, title: 'Test123' }).toEqual(await getRepository(Event).findOneOrFail(events[0].id));
		});

		test('Multiple edits are persisted', async () => {
			const event = await getRepository(Event).save(events[0]);
			await eventService.patchEvent({
				id: event.id,
				title: 'Test123'
			});
			expect({ ...event, title: 'Test123' }).toEqual(await getRepository(Event).findOneOrFail(events[0].id));
			await eventService.patchEvent({
				id: event.id,
				title: 'Testing title',
				description: 'New description!'
			});
			expect({ ...event, title: 'Testing title', description: 'New description!' }).toEqual(await getRepository(Event).findOneOrFail(events[0].id));
		});

		test('Fails on invalid id/event not found', async () => {
			await expect(eventService.patchEvent({ id: '', title: 'Test123' })).rejects.toMatchObject({ httpCode: 400 });
			await expect(eventService.findAll()).resolves.toEqual([]);
			await expect(eventService.patchEvent({ id: '209d15de-57ba-4bb9-a9c9-e00042841b9b', title: 'Test123' })).rejects.toMatchObject({ httpCode: 400 });
			await expect(eventService.findAll()).resolves.toEqual([]);
		});

		test('Fails for invalid data (title too long)', async () => {
			const event = await getRepository(Event).save(events[0]);
			await expect(eventService.patchEvent({ id: event.id, title: 'Test123'.repeat(50) })).rejects.toMatchObject({ httpCode: 400 });
			await expect(eventService.findAll()).resolves.toEqual([event]);
		});
	});
});
