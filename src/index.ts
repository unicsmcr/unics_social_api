import 'reflect-metadata';

// Load variables from .env into process.env
import { config as loadEnv } from 'dotenv';
loadEnv();

import express, { Router, Response, Request, NextFunction } from 'express';
import cors from 'cors';

import { createConnection } from 'typeorm';
import { getConfig } from './util/config';
import { UserRoutes } from './routes/UserRoutes';
import { container } from 'tsyringe';
import EmailService from './services/email/EmailService';
import MockEmailService from './services/email/MockEmailService';
import { APIError, HttpCode } from './util/errors';
import { Server as WebSocketServer } from 'ws';
import GatewayController from './controllers/GatewayController';
import { EventRoutes } from './routes/EventRoutes';
import { ChannelRoutes } from './routes/ChannelRoutes';
import { logger } from './util/logger';

export function createExpress() {
	const app = express();
	app.use(cors({
		origin: getConfig().host
	}));
	app.use(express.json());

	const router = Router();
	app.use('/api/v1', router);
	app.use('/assets', express.static(`${__dirname}/../assets`));

	// Use the right email service
	// The only time the EmailService is already registered is during tests, so we shouldn't interfere in that case.
	if (!container.isRegistered(EmailService)) {
		container.register<EmailService>(EmailService, {
			useClass: getConfig().sendgrid.mock ? MockEmailService : EmailService
		});
	}

	container.resolve(UserRoutes).routes(router);
	container.resolve(EventRoutes).routes(router);
	container.resolve(ChannelRoutes).routes(router);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	app.use((err: any, req: Request, res: Response, next: NextFunction) => {
		/*
			to-do:
			- refactor this to not use console.error, use pino
			- don't send error message to enduser in production
		*/
		if (err instanceof APIError) {
			res.status(err.httpCode).send({ error: err.message });
		} else {
			if (getConfig().logErrors) {
				logger.error(err);
			}
			res.status(HttpCode.InternalError).send({ error: 'Something went wrong!' });
		}
	});

	return app;
}

export async function createDBConnection() {
	return createConnection({
		type: 'postgres',
		...getConfig().db, // username, password, host, port, database
		entities: [
			`${__dirname}/entities/**/*{.js,.ts}`
		],
		synchronize: true,
		logging: false
	});
}

export async function createApp() {
	const app = createExpress();
	await createDBConnection();
	return app;
}

export function createGateway(wss: WebSocketServer) {
	const gatewayController = container.resolve(GatewayController);
	gatewayController.bindTo(wss);
	return gatewayController;
}
