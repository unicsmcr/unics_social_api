import { PrimaryGeneratedColumn, OneToOne, Entity } from 'typeorm';
import { Event } from './Event';
export abstract class Channel {
	public abstract id: string;
}

@Entity()
export class EventChannel implements Channel {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@OneToOne(() => Event, event => event.channel)
	public event!: Event;
}
