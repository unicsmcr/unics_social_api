import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IsString } from 'class-validator';
import { User } from './User';

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

	public toJSON() {
		const { course, yearOfStudy, profilePicture, instagram, facebook, twitter } = this;
		return {
			course,
			yearOfStudy,
			profilePicture,
			instagram,
			facebook,
			twitter
		};
	}
}
