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
			await expect(eventService.createEvent(payload)).rejects.toThrow();
			await expect(getRepository(Event).findOneOrFail()).rejects.toThrow();
		});

		test('Throws when description too long', async () => {
			const payload = { ...basePayload, title: 'b'.repeat(4000) };
			await expect(eventService.createEvent(payload)).rejects.toThrow();
			await expect(getRepository(Event).findOneOrFail()).rejects.toThrow();
		});
	});
});
