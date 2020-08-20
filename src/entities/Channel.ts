import { PrimaryGeneratedColumn, OneToOne, Entity, TableInheritance, ChildEntity, ManyToMany, Column, JoinColumn } from 'typeorm';
import { Event, APIEvent } from './Event';
import { User } from './User';
import { IsDate } from 'class-validator';
import { VideoIntegration, APIVideoIntegration } from './VideoIntegration';

export interface APIChannel {
	id: string;
	lastUpdated: string;
}

export interface APIEventChannel extends APIChannel {
	event: APIEvent;
	type: 'event';
}

export interface APIDMChannel extends APIChannel {
	users: string[];
	type: 'dm';
	video?: APIVideoIntegration & { accessToken?: string };
}

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Channel {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column('timestamp', { 'default': () => 'CURRENT_TIMESTAMP' })
	@IsDate()
	public lastUpdated!: Date;

	public toJSON(): APIChannel {
		return {
			id: this.id,
			lastUpdated: this.lastUpdated.toISOString()
		};
	}
}

@ChildEntity()
export class EventChannel extends Channel {
	@OneToOne(() => Event, event => event.channel)
	public event!: Event;

	public toJSON(): APIEventChannel {
		return {
			...super.toJSON(),
			type: 'event',
			event: this.event.toJSON()
		};
	}
}

@ChildEntity()
export class DMChannel extends Channel {
	@ManyToMany(() => User, user => user.dmChannels, { eager: true })
	public users!: User[];

	@OneToOne(() => VideoIntegration, videoIntegration => videoIntegration.dmChannel, { nullable: true, eager: true })
	@JoinColumn()
	public videoIntegration?: VideoIntegration;

	public toJSON(): APIDMChannel {
		return {
			...super.toJSON(),
			type: 'dm',
			users: this.users.map(user => user.id),
			video: this.videoIntegration ? this.videoIntegration.toJSON() : undefined
		};
	}
}
