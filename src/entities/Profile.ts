import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IsString } from 'class-validator';
import { User } from './User';

export interface APIProfile {
	id: string;
	course: string;
	yearOfStudy: number;
	profilePicture?: string;
	instagram?: string;
	facebook?: string;
	twitter?: string;
}

@Entity()
export default class Profile {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@OneToOne(() => User, user => user.profile)
	public user!: User;

	@Column()
	@IsString()
	public course!: string;

	@Column({ type: 'integer' })
	public yearOfStudy!: number;

	@Column({ nullable: true })
	public profilePicture?: string;

	@Column({ nullable: true })
	public instagram?: string;

	@Column({ nullable: true })
	public facebook?: string;

	@Column({ nullable: true })
	public twitter?: string;

	public toJSON(): APIProfile {
		const { id, course, yearOfStudy, profilePicture, instagram, facebook, twitter } = this;
		return {
			id,
			course,
			yearOfStudy,
			profilePicture,
			instagram,
			facebook,
			twitter
		};
	}
}
