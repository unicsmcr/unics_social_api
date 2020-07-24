import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { getUser, isAdmin } from './middleware';
import { EventController } from '../controllers/EventController';

@injectable()
export class EventRoutes {
	private readonly eventController: EventController;

	public constructor(@inject(EventController) eventController: EventController) {
		this.eventController = eventController;
	}

	public routes(router: Router): void {
		router.post('/events', getUser, isAdmin, this.eventController.createEvent.bind(this.eventController));
	}
}
