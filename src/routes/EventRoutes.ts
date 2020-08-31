import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { getUser, isAdmin, isVerified, uploadImg } from './middleware';
import { EventController } from '../controllers/EventController';

@injectable()
export class EventRoutes {
	private readonly eventController: EventController;

	public constructor(@inject(EventController) eventController: EventController) {
		this.eventController = eventController;
	}

	public routes(router: Router): void {
		router.post('/events', getUser, isAdmin, uploadImg('image'), this.eventController.createEvent.bind(this.eventController));
		router.get('/events', getUser, isVerified, this.eventController.getAllEvents.bind(this.eventController));
		router.patch('/events/:id', getUser, isAdmin, uploadImg('image'), this.eventController.editEvent.bind(this.eventController));
	}
}
