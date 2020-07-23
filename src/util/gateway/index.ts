export class GatewayError extends Error {}

export enum GatewayPacketType {
	Identify,
	Hello
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
