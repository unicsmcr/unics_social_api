import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Channel } from './Channel';
import { User } from './User';
import { IsDate, IsString, MaxLength } from 'class-validator';

@Entity()
export default class Message {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@ManyToOne(() => Channel)
	public channel!: Channel;

	@ManyToOne(() => User)
	public author!: User;

	@Column()
	@IsString()
	@MaxLength(400, { message: 'A message can be 400 characters at most' })
	public content!: string;

	@Column('timestamp')
	@IsDate()
	public time!: Date;
}
