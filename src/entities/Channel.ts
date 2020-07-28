import { PrimaryGeneratedColumn, OneToOne, Entity, TableInheritance, ChildEntity } from 'typeorm';
import { Event } from './Event';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Channel {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;
}

@ChildEntity()
export class EventChannel extends Channel {
	@OneToOne(() => Event, event => event.channel)
	public event!: Event;
}
