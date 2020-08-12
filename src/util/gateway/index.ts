import { APIMessage } from '../../entities/Message';
import { QueueOptions } from '../discovery/DiscoveryQueue';

export class GatewayError extends Error {}

export enum GatewayPacketType {
	Identify = 'IDENTIFY',
	Hello = 'HELLO',
	MessageCreate = 'MESSAGE_CREATE',
	MessageDelete = 'MESSAGE_DELETE',
	// Sent by the client to join a Discovery queue
	JoinDiscoveryQueue = 'JOIN_DISCOVERY_QUEUE',
	// Sent by the client to leave a Discovery queue
	LeaveDiscoveryQueue = 'LEAVE_DISCOVERY_QUEUE',
	// Sent by the gateway periodically to inform the client of how many users are in the queue
	DiscoveryQueueUpdate = 'DISCOVERY_QUEUE_UPDATE',
	// Sent by the gateway once a match has been made
	DiscoveryQueueMatch = 'DISCOVERY_QUEUE_MATCH'
}

export interface GatewayPacket {
	type: GatewayPacketType;
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

export interface JoinDiscoveryQueuePacket extends GatewayPacket {
	type: GatewayPacketType.JoinDiscoveryQueue;
	data: {
		eventID: string;
		options: QueueOptions;
	};
}

export interface LeaveDiscoveryQueuePacket extends GatewayPacket {
	type: GatewayPacketType.LeaveDiscoveryQueue;
	data: {
		eventID: string;
	};
}

export interface DiscoveryQueueUpdatePacket extends GatewayPacket {
	type: GatewayPacketType.DiscoveryQueueUpdate;
	data: {
		eventID: string;
		queueLength: number;
	};
}

export interface DiscoveryQueueMatchPacket extends GatewayPacket {
	type: GatewayPacketType.DiscoveryQueueMatch;
	data: {
		// to-do :)
	};
}
