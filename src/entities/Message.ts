import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Channel } from './Channel';
import { User } from './User';
import { IsDate, IsString, MaxLength, MinLength } from 'class-validator';

export interface APIMessage {
	id: string;
	channelID: string;
	authorID: string;
	content: string;
	time: string;
}

@Entity()
export default class Message {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@ManyToOne(() => Channel, { eager: true })
	public channel!: Channel;

	@ManyToOne(() => User, { eager: true })
	public author!: User;

	@Column()
	@IsString()
	@MinLength(1, { message: 'A message must be at least 1 character long' })
	@MaxLength(400, { message: 'A message can be 400 characters at most' })
	public content!: string;

	@Column('timestamp')
	@IsDate()
	public time!: Date;

	public toJSON(): APIMessage {
		return {
			id: this.id,
			channelID: this.channel.id,
			authorID: this.author.id,
			content: this.content,
			time: this.time.toISOString()
		};
	}
}
