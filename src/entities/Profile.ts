import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';
import { IsString } from 'class-validator';

export interface APIProfile {
	id: string;
	course: string;
	yearOfStudy: string;
	profilePicture?: string;
	instagram?: string;
	facebook?: string;
	twitter?: string;
}

export enum Course {
	ARTIFICIAL_INTELLIGENCE = 'Artificial Intelligence',
	COMPUTER_SCIENCE_AND_MATHEMATICS = 'Computer Science and Mathematics',
	COMPUTER_SCIENCE = 'Computer Science',
	HUMAN_COMPUTER_INTERACTION = 'Human Computer Interaction',
	COMPUTER_SYSTEMS_ENGINEERING = 'Computer Systems Engineering',
	SOFTWARE_ENGINEERING = 'Software Engineering'
}

export enum Year {
	ONE = 'First Year',
	TWO = 'Second Year',
	THREE = 'Final Year Bachelors',
	FOUNDATION = 'Foundation Year',
	PENULTIMATE_MASTERS = 'Third Year Masters',
	MASTERS = 'Final Year Masters',
	INDUSTRIAL = 'Industrial year',
	PHD = 'PHD (Any Year)'
}

@Entity()
export default class Profile {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@OneToOne(() => User, user => user.profile)
	public user!: User;

	@IsString()
	@Column({
		'type': 'enum',
		'enum': Course
	})
	public course!: string;

	@IsString()
	@Column({ 
		'type': 'enum',
		'enum': Year
	})
	public yearOfStudy!: string;

	@Column({ 'default': false })
	public avatar!: boolean;

	@Column({ nullable: true })
	public instagram?: string;

	@Column({ nullable: true })
	public facebook?: string;

	@Column({ nullable: true })
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
