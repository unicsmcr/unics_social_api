import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IsDate, MaxLength, IsString } from 'class-validator';
import { User } from './User';

export interface APIReport {
	id: string;
	reportingUserID: string;
	currentTime: string;
	description: string;
}

@Entity()
export default class Report {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@OneToOne(() => User, user => user.report)
	public reportedUser!: User;

	@Column({
		type: 'uuid'
	})
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
			reportingUserID: this.reportingUser.id,
			currentTime: this.currentTime.toISOString(),
			description: this.description
		};
	}
}
