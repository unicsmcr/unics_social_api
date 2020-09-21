import { User } from './User';
import { IsDate } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

export interface APINote {
	id: string;
	ownerID: string;
	targetUserID: string;
	noteType: NoteType;
	time: string;
}

export enum NoteType {
	Blocked = 0,
	Liked = 1
}

@Entity()
export default class Note {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@ManyToOne(() => User)
	@JoinColumn()
	public owner!: User;

	@ManyToOne(() => User)
	@JoinColumn()
	public targetUser!: User;

	@Column({
		'type': 'enum',
		'enum': NoteType
	})
	public noteType!: NoteType;

	@Column('timestamptz')
	@IsDate()
	public time!: Date;

	public toJSON() {
		return {
			id: this.id,
			ownerID: this.owner.id,
			targetUserID: this.targetUser.id,
			noteType: this.noteType,
			time: this.time.toISOString()
		};
	}
}
