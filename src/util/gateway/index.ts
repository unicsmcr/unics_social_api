export class GatewayError extends Error {}

export enum GatewayPacketType {
	Identify,
	Hello
}

export interface GatewayPacket {
	t: GatewayPacketType;
}

export interface IdentifyGatewayPacket extends GatewayPacket {
	t: GatewayPacketType.Identify;
	d: {
		token: string;
	};
}

export interface HelloGatewayPacket extends GatewayPacket {
	t: GatewayPacketType.Hello;
}
