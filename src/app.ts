import { createApp } from '.';
import { getConfig } from './util/config';

createApp()
	.then(app => {
		const port = getConfig().port;
		app.listen(port, () => {
			console.log(`Listening on port ${port}`);
		});
	})
	.catch(console.log);
