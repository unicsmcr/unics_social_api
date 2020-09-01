import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IsString, Matches } from 'class-validator';
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

	@Column({ 'default': false })
	public avatar!: boolean;

	@Column({ nullable: true })
	@Matches(/^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/, {message: 'Not a valid instagram username'})
	public instagram?: string;

	@Column({ nullable: true })
	public facebook?: string;

	@Column({ nullable: true })
	@Matches(/^[^\W][\w]{1,15}?$/, {message: 'Not a valid twitter username'})
	public twitter?: string;

	public toJSON() {
		const { id, course, yearOfStudy, avatar, instagram, facebook, twitter } = this;
		return {
			id,
			course,
			yearOfStudy,
			avatar,
			instagram,
			facebook,
			twitter
		};
	}
}
