import { Entity, Column, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity()
export default class Profile {
	@PrimaryGeneratedColumn({ type: 'uuid' })
	public id!: string;

	@OneToOne(() => User)
	public user!: User;

	@Column()
	public course!: string;

	@Column()
	public yearOfStudy!: number;

	@Column()
	public profilePicture!: string;

	@Column({ nullable: true })
	public instagram?: string;

	@Column({ nullable: true })
	public facebook?: string;

	@Column({ nullable: true })
	public twitter?: string;
}
