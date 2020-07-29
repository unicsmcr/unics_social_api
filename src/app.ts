import { createApp, createGateway } from '.';
import { getConfig } from './util/config';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';

createApp()
	.then(app => {
		const port = getConfig().port;
		const server = createServer(app);

		const wss = new WebSocketServer({ server, path: '/api/v1/gateway' });
		createGateway(wss);

		server.listen(port, () => {
			console.log(`Listening on port ${port}`);
		});
	})
	.catch(console.log);
