/*
	waits for a port to be reachable before exiting
	used as a cross-platform alternative to nc
*/

const net = require('net');
const port = process.argv[2];

function attemptConnect() {
	const socket = new net.Socket();
	socket.setTimeout(1e3);

	const teardown = () => {
		socket.destroy();
		attemptConnect();
	};

	socket.once('error', teardown);
	socket.once('timeout', teardown);
	socket.connect({ port }, () => {
		setTimeout(() => {
			socket.end();
			process.exit(0);
		}, 1e3);
	});
}

attemptConnect();
