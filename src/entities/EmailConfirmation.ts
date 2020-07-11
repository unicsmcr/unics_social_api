import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class EmailConfirmation {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@JoinColumn()
	@OneToOne(() => User)
	public user!: User;
}
