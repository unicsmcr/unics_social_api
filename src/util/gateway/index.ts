import { APIMessage } from '../../entities/Message';

export class GatewayError extends Error {}

export enum GatewayPacketType {
	Identify = 'IDENTIFY',
	Hello = 'HELLO',
	MessageCreate = 'MESSAGE_CREATE',
	MessageDelete = 'MESSAGE_DELETE',
	Ping = 'PING',
	Pong = 'PONG'
}

export interface GatewayPacket {
	type: GatewayPacketType;
}

export interface PingGatewayPacket {
	type: GatewayPacketType.Ping;
	data: {
		timestamp: number;
	};
}

export interface PongGatewayPacket {
	type: GatewayPacketType.Pong;
	data: {
		timestamp: number;
	};
}

export interface IdentifyGatewayPacket extends GatewayPacket {
	type: GatewayPacketType.Identify;
	data: {
		token: string;
	};
}

export interface HelloGatewayPacket extends GatewayPacket {
	type: GatewayPacketType.Hello;
}

export interface MessageCreateGatewayPacket extends GatewayPacket {
	type: GatewayPacketType.MessageCreate;
	data: {
		message: APIMessage;
	};
}

export interface MessageDeleteGatewayPacket extends GatewayPacket {
	type: GatewayPacketType.MessageDelete;
	data: {
		messageID: string;
		channelID: string;
	};
}
