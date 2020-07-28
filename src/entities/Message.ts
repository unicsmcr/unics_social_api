import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Channel } from './Channel';

@Entity()
export default class Message {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@ManyToOne(() => Channel)
	public channel!: Channel;
}
