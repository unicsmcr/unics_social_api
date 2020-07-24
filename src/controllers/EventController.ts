import { UserService } from '../services/UserService';
import { NextFunction, Request } from 'express';
import { inject, injectable } from 'tsyringe';
import { AuthenticatedResponse } from '../routes/middleware/getUser';
import EventService from '../services/EventService';

@injectable()
export class EventController {
	private readonly eventService: EventService;

	public constructor(@inject(UserService) eventService: EventService) {
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
}
