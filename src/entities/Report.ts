import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsDate, MaxLength, IsString, MinLength } from 'class-validator';
import { User } from './User';

export interface APIReport {
	id: string;
	reportedUserID: string;
	reportingUserID: string;
	currentTime: string;
	description: string;
}

@Entity()
export default class Report {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@ManyToOne(() => User)
	@JoinColumn()
	public reportedUser!: User;

	@ManyToOne(() => User)
	@JoinColumn()
	public reportingUser!: User;

	@Column('timestamptz')
	@IsDate()
	public currentTime!: Date;

	@Column()
	@IsString()
	@MinLength(10, { message: 'A report description must be at least 10 characters' })
	@MaxLength(2000, { message: 'A report description must be 2000 characters at most' })
	public description!: string;

	public toJSON() {
		return {
			id: this.id,
			reportedUserID: this.reportedUser.id,
			reportingUserID: this.reportingUser.id,
			currentTime: this.currentTime.toISOString(),
			description: this.description
		};
	}
}
