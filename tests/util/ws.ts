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
		setImmediate(() => this.emit('listening'));
	}

	public addClient(client: MockWebSocket) {
		const serverSideClient = new MockWebSocket();
		serverSideClient.mirror = client;
		this.clients.add(serverSideClient);
		setImmediate(() => this.emit('connection', serverSideClient, {}));
		serverSideClient.on('close', () => this.clients.delete(serverSideClient));
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
	public allMessages: string[];
	private _nextMessagePromise?: [(data: string) => void, (error: Error) => void];
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
		this.allMessages = [];
		this.on('message', data => {
			this.messages.push(data);
			this.allMessages.push(data);
			if (this._nextMessagePromise) {
				this._nextMessagePromise[0](this.messages.shift()!);
				this._nextMessagePromise = undefined;
			}
		});
		this.on('close', () => {
			if (this._nextMessagePromise) {
				this._nextMessagePromise[1](new Error('WebSocket closed.'));
			}
		});
		this.readyState = this.OPEN;
	}

	public get nextMessage(): Promise<string> {
		if (this.messages.length > 0) {
			return Promise.resolve(this.messages.shift()!);
		}
		return new Promise((resolve, reject) => {
			this._nextMessagePromise = [resolve, reject];
		});
	}

	public close(code?: number, reason?: string): Promise<void> {
		if (this.readyState === this.CLOSED) return Promise.resolve();
		setImmediate(() => this.mirror.emit('close', code, reason));
		this.emit('close', code, reason);
		this.readyState = this.CLOSED;
		this.mirror.readyState = this.CLOSED;
		return Promise.resolve();
	}

	public ping(data?: any, mask?: boolean, cb?: (err: any) => void): Promise<void> {
		setImmediate(() => this.mirror.emit('ping', data));
		if (cb) cb(undefined);
		return Promise.resolve();
	}

	public pong(data?: any, mask?: boolean, cb?: (err: any) => void): Promise<void> {
		setImmediate(() => this.mirror.emit('pong', data));
		if (cb) cb(undefined);
		return Promise.resolve();
	}

	public send(data: any, options?: any, cb?: (err: any) => void): Promise<void> {
		if (typeof options === 'function') cb = options;
		setImmediate(() => this.mirror.emit('message', data));
		if (cb) cb(undefined);
		return Promise.resolve();
	}

	public terminate(): Promise<void> {
		return this.close();
	}

	public addEventListener() {
		throw new Error('Method not implemented.');
	}

	public removeEventListener() {
		throw new Error('Method not implemented.');
	}
}
