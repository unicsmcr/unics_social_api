import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Matches, IsOptional, IsEnum } from 'class-validator';
import { User } from './User';

export interface APIProfile {
	id: string;
	course: Course;
	yearOfStudy: Year;
	profilePicture?: string;
	instagram?: string;
	facebook?: string;
	twitter?: string;
	linkedin?: string;
}

export enum Course {
	ARTIFICIAL_INTELLIGENCE = 'Artificial Intelligence',
	COMPUTER_SCIENCE_AND_MATHEMATICS = 'Computer Science and Mathematics',
	COMPUTER_SCIENCE = 'Computer Science',
	HUMAN_COMPUTER_INTERACTION = 'Human Computer Interaction',
	COMPUTER_SYSTEMS_ENGINEERING = 'Computer Systems Engineering',
	SOFTWARE_ENGINEERING = 'Software Engineering',
	OTHER = 'Other'
}

export enum Year {
	ONE = 'First Year',
	TWO = 'Second Year',
	THREE = 'Final Year Bachelors',
	FOUNDATION = 'Foundation Year',
	MASTERS = 'Masters Year',
	INDUSTRIAL = 'Industrial Year',
	PHD = 'PhD Student',
	OTHER = 'Other'
}

export enum Visibility {
	Private = 0,
	Public = 1
}

@Entity()
export default class Profile {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@OneToOne(() => User, user => user.profile)
	public user!: User;

	@IsEnum(Course)
	@Column({
		'type': 'enum',
		'enum': Course
	})
	public course!: Course;

	@IsEnum(Year)
	@Column({
		'type': 'enum',
		'enum': Year
	})
	public yearOfStudy!: Year;

	@Column({ 'default': false })
	public avatar!: boolean;

	@Column({ nullable: true })
	@Matches(/(^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$)|(^$)/, { message: 'Not a valid instagram username' })
	@IsOptional()
	public instagram?: string;

	@Column({ nullable: true })
	@Matches(/(^[A-Za-z0-9\.]{5,}$)|(^$)/, { message: 'Not a valid facebook username' })
	@IsOptional()
	public facebook?: string;

	@Column({ nullable: true })
	@Matches(/(^[^\W][\w]{1,15}$)|(^$)/, { message: 'Not a valid twitter username' })
	@IsOptional()
	public twitter?: string;

	@Column({ nullable: true })
	@Matches(/(^(\w-?){0,29}$)|(^$)/, { message: 'Not a valid linkedin URL' })
	@IsOptional()
	public linkedin?: string;

	@Column({
		'type': 'enum',
		'enum': Visibility,
		'default': Visibility.Private
	})
	public visibility!: Visibility;

	public toJSON() {
		const { id, course, yearOfStudy, avatar, instagram, facebook, twitter, linkedin, visibility } = this;
		return {
			id,
			course,
			yearOfStudy,
			avatar,
			instagram,
			facebook,
			twitter,
			linkedin,
			visibility
		};
	}
}
