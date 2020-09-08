import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { IsDate, MaxLength, IsString } from 'class-validator';
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
	public reportedUser!: User;

	@ManyToOne(() => User)
	public reportingUser!: User;

	@Column('timestamp')
	@IsDate()
	public currentTime!: Date;

	@Column()
	@IsString()
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
