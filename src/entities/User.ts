import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum AccountStatus {
	UNVERIFIED = 0,
	VERIFIED = 1,
	RESTRICTED = 2
}

export enum AccountType {
	USER = 0,
	ADMIN = 1
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
}
