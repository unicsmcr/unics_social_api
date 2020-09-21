import { User } from './User';
import { IsDate } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

export interface APINote {
	id: string;
	ownerID: string;
	targetUserID: string;
	time: string;
}

export enum NoteType {
	BLOCKED = 0,
	LIKED = 1
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

	@Column('timestamptz')
	@IsDate()
	public time!: Date;

	public toJSON() {
		return {
			id: this.id,
			ownerID: this.owner.id,
			targetUserID: this.targetUser.id,
			time: this.time.toISOString()
		};
	}
}
