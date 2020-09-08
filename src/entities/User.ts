import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { IsEmail, Matches, MinLength, MaxLength, IsString } from 'class-validator';
import Profile, { APIProfile } from './Profile';
import { DMChannel } from './Channel';
import Report from './Report';

export enum AccountStatus {
	Unverified = 0,
	Verified = 1,
	Restricted = 2
}

export enum AccountType {
	User = 0,
	Admin = 1
}

export interface APIUser {
	id: string;
	forename: string;
	surname: string;
	accountStatus: AccountStatus;
	accountType: AccountType;
	profile?: APIProfile;
}

export interface APIPrivateUser extends APIUser {
	email: string;
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

	@Column({ select: false })
	public password!: string;

	@Column({ unique: true })
	@IsEmail(undefined, { message: 'A University of Manchester student email account is required' })
	@Matches(/(@(\w+\.)?manchester\.ac\.uk)$/, { message: 'A University of Manchester student email account is required' })
	public email!: string;

	@Column()
	public accountStatus!: AccountStatus;

	@Column()
	public accountType!: AccountType;

	@ManyToMany(() => DMChannel, channel => channel.users)
	@JoinTable()
	public dmChannels!: DMChannel[];

	@OneToOne(() => Profile, profile => profile.user, { nullable: true, eager: true, cascade: true })
	@JoinColumn()
	public profile?: Profile;

	@OneToMany(() => Report, report => report.reportedUser)
	@JoinColumn()
	public report?: Report[];

	public toJSON(): APIUser {
		const { id, forename, surname, accountStatus, accountType, profile } = this;
		return { id, forename, surname, accountStatus, accountType, profile: profile?.toJSON() };
	}

	public toJSONPrivate(): APIPrivateUser {
		return { ...this.toJSON(), email: this.email };
	}
}
