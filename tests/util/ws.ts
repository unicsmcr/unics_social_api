/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import WebSocket, { Server } from 'ws';
import { EventEmitter } from 'typeorm/platform/PlatformTools';

export class MockWebSocketServer extends EventEmitter implements Server {
	public options!: WebSocket.ServerOptions;
	public path!: string;
	public clients: Set<WebSocket>;

	public constructor() {
		super();
		this.clients = new Set();
		this.emit('listening');
	}

	public addClient(client: MockWebSocket) {
		const serverSideClient = new MockWebSocket();
		serverSideClient.mirror = client;
		if (!this.clients.has(client)) {
			this.clients.add(client);
			setImmediate(() => this.emit('connection', serverSideClient, {}));
		}
		return serverSideClient;
	}

	public address(): string | WebSocket.AddressInfo {
		throw new Error('Method not implemented.');
	}

	public close(cb?: (err?: Error) => void): void {
		for (const client of this.clients) {
			client.close();
		}
		this.emit('close');
		if (cb) cb();
	}

	public handleUpgrade(): void {
		throw new Error('Method not implemented.');
	}

	public shouldHandle(): boolean | Promise<boolean> {
		throw new Error('Method not implemented.');
	}
}


export class MockWebSocket extends EventEmitter implements WebSocket {
	public binaryType!: string;
	public bufferedAmount!: number;
	public extensions!: string;
	public protocol!: string;
	public readyState: number;
	public url!: string;
	public CONNECTING = WebSocket.CONNECTING;
	public OPEN = WebSocket.OPEN;
	public CLOSING = WebSocket.CLOSING;
	public CLOSED = WebSocket.CLOSED;
	public mirror!: MockWebSocket;
	public messages: string[];
	public onopen!: (event: WebSocket.OpenEvent) => void;
	public onerror!: (event: WebSocket.ErrorEvent) => void;
	public onclose!: (event: WebSocket.CloseEvent) => void;
	public onmessage!: (event: WebSocket.MessageEvent) => void;

	public constructor(server?: MockWebSocketServer) {
		super();
		setImmediate(() => this.emit('open'));
		if (server) {
			this.mirror = server.addClient(this);
			setImmediate(() => this.mirror.emit('open'));
		}
		this.messages = [];
		this.on('message', data => {
			this.messages.push(data);
		});
		this.readyState = this.OPEN;
	}

	public close(code?: number, reason?: string): void {
		this.mirror.emit('close', code, reason);
		this.readyState = this.CLOSED;
		this.mirror.readyState = this.CLOSED;
	}

	public ping(data?: any, mask?: boolean, cb?: (err: any) => void): Promise<void> {
		this.mirror.emit('ping', data);
		if (cb) cb(undefined);
		return Promise.resolve();
	}

	public pong(data?: any, mask?: boolean, cb?: (err: any) => void): Promise<void> {
		this.mirror.emit('pong', data);
		if (cb) cb(undefined);
		return Promise.resolve();
	}

	public send(data: any, options?: any, cb?: (err: any) => void): Promise<void> {
		this.mirror.emit('message', data);
		if (cb) cb(undefined);
		return Promise.resolve();
	}

	public terminate(): Promise<void> {
		this.mirror.emit('close');
		this.readyState = this.CLOSED;
		this.mirror.readyState = this.CLOSED;
		return Promise.resolve();
	}

	public addEventListener() {
		throw new Error('Method not implemented.');
	}

	public removeEventListener() {
		throw new Error('Method not implemented.');
	}
}
