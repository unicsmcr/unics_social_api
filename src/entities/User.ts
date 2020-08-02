import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { IsEmail, Matches, MinLength, MaxLength, IsString } from 'class-validator';
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
	@IsString()
	@MinLength(1, { message: 'Forename must be between 1 to 40 characters long' })
	@MaxLength(40, { message: 'Forename must be between 1 to 40 characters long' })
	public forename!: string;

	@Column()
	@IsString()
	@MinLength(1, { message: 'Surname must be between 1 to 40 characters long' })
	@MaxLength(40, { message: 'Surname must be between 1 to 40 characters long' })
	public surname!: string;

	@Column()
	public password!: string;

	@Column({ unique: true })
	@IsEmail(undefined, { message: 'A University of Manchester student email account is required' })
	@Matches(/(@student\.manchester\.ac\.uk)$/, { message: 'A University of Manchester student email account is required' })
	public email!: string;

	@Column()
	public accountStatus!: AccountStatus;

	@Column()
	public accountType!: AccountType;

	@OneToOne(() => Profile, profile => profile.user, { nullable: true, eager: true, cascade: true })
	@JoinColumn()
	public profile?: Profile;

	public toJSON() {
		const { id, forename, surname, email, accountStatus, accountType, profile } = this;
		return { id, forename, surname, email, accountStatus, accountType, profile: profile?.toJSON() };
	}

	public toLimitedJSON() {
		const { id, forename, surname, accountStatus, accountType, profile } = this;
		return { id, forename, surname, accountStatus, accountType, profile: profile?.toJSON() };
	}
}
