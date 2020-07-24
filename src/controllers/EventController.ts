import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import EventService from '../services/EventService';

@injectable()
export class EventController {
	private readonly eventService: EventService;

	public constructor(@inject(EventService) eventService: EventService) {
		this.eventService = eventService;
	}

	public async createEvent(req: Request, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const event = await this.eventService.createEvent(req.body);
			res.json({ event });
		} catch (error) {
			next(error);
		}
	}

	public async getAllEvents(req: Request, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const events = await this.eventService.findAll();
			res.json({ events });
		} catch (error) {
			next(error);
		}
	}

	public async editEvent(req: Request & { params: { id: string } }, res: AuthenticatedResponse, next: NextFunction): Promise<void> {
		try {
			const event = await this.eventService.patchEvent({ ...req.body, id: req.params.id });
			res.json({ event });
		} catch (error) {
			next(error);
		}
	}
}
