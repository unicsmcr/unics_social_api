import { User } from './User';
import { IsDate, IsOptional, MaxLength } from 'class-validator';
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

	@ManyToOne(() => User, { primary: true })
	@JoinColumn()
	public owner!: User;

	@ManyToOne(() => User, { primary: true })
	@JoinColumn()
	public targetUser!: User;

	@Column({
		'type': 'enum',
		'enum': NoteType
	})
	public noteType!: NoteType;

	@Column({ nullable: true })
	@MaxLength(100, { message: 'A note description must be 100 characters at most' })
	@IsOptional()
	public description?: string;

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
