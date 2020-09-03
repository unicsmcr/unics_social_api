import { createApp, createGateway } from '.';
import { getConfig } from './util/config';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import { logger } from './logger';

createApp()
	.then(app => {
		const port = getConfig().port;
		const server = createServer(app);

		const wss = new WebSocketServer({ server, path: '/api/v1/gateway' });
		createGateway(wss);

		server.listen(port, () => {
			logger.info(`Listening on port ${port}`);
		});
	})
	.catch(logger.info);
