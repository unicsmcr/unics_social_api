import 'reflect-metadata';

import { getChannel } from '../../../src/routes/middleware';
import { container } from 'tsyringe';
import { mock, instance, when, objectContaining, anything } from 'ts-mockito';
import { AccountStatus } from '../../../src/entities/User';
import ChannelService from '../../../src/services/ChannelService';
import events from '../../fixtures/events';
import users from '../../fixtures/users';
import { APIError, HttpCode } from '../../../src/util/errors';

const verifiedUserFixture = users.find(user => user.accountStatus === AccountStatus.Verified);

const channelFixture = events[0].channel;
const channelFixture1 = users[2].dmChannels[0];
let mockedChannelService: ChannelService;

beforeAll(() => {
	mockedChannelService = mock(ChannelService);
	container.clearInstances();
	container.register<ChannelService>(ChannelService, { useValue: instance(mockedChannelService) });

	when(mockedChannelService.findOne(anything())).thenResolve(undefined);
	when(mockedChannelService.findOne(objectContaining({ id: channelFixture.id }))).thenResolve(channelFixture);
	when(mockedChannelService.findOne(objectContaining({ id: channelFixture1.id }))).thenResolve(channelFixture1);
});

describe('getChannel middleware', () => {
	test('Resolves valid channel ID', async () => {
		const req: any = { params: { channelID: channelFixture.id } };
		const res: any = { locals: { user: verifiedUserFixture } };
		const next: any = jest.fn();
		await getChannel(req, res, next);
		expect(res.locals.channel).toEqual(channelFixture);
		expect(next).toHaveBeenCalledWith();
	});

	test('Allows registered User for DM Channel', async () => {
		const req: any = { params: { channelID: channelFixture1.id } };
		const res: any = { locals: { user: users[2] } };
		const next: any = jest.fn();
		await getChannel(req, res, next);
		expect(res.locals.channel).toEqual(channelFixture1);
		expect(next).toHaveBeenCalledWith();
	});

	test('Throws when unregistered User for DM Channel', async () => {
		const req: any = { params: { channelID: channelFixture1.id } };
		const res: any = { locals: { user: verifiedUserFixture } };
		const next: any = jest.fn();
		await getChannel(req, res, next);
		expect(res.locals.channel).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(APIError);
		expect(next.mock.calls[0][0]).toMatchObject({ httpCode: HttpCode.Forbidden });
	});

	test('Throws when channel not found', async () => {
		const req: any = { params: { channelID: 'a random id' } };
		const res: any = { locals: { user: verifiedUserFixture } };
		const next: any = jest.fn();
		await getChannel(req, res, next);
		expect(res.locals.channel).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(APIError);
		expect(next.mock.calls[0][0]).toMatchObject({ httpCode: HttpCode.NotFound });
	});

	test('Throws when no channel provided', async () => {
		const req: any = { params: {} };
		const res: any = { locals: { user: verifiedUserFixture } };
		const next: any = jest.fn();
		await getChannel(req, res, next);
		expect(res.locals.channel).toBeUndefined();
		expect(next.mock.calls[0][0]).toBeInstanceOf(APIError);
		expect(next.mock.calls[0][0]).toMatchObject({ httpCode: HttpCode.NotFound });
	});
});
