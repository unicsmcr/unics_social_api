import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import Profile from './Profile';

export enum AccountStatus {
	Unverified = 0,
	Verified = 1,
	Restricted = 2
}

export enum AccountType {
	User = 0,
	Admin = 1
}

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column()
	public forename!: string;

	@Column()
	public surname!: string;

	@Column()
	public password!: string;

	@Column({ unique: true })
	public email!: string;

	@Column()
	public accountStatus!: AccountStatus;

	@Column()
	public accountType!: AccountType;

	@OneToOne(() => Profile, profile => profile.user, { nullable: true, eager: true, cascade: true })
	@JoinColumn()
	public profile?: Profile;
}
