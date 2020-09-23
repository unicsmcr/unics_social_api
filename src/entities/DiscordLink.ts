import { PrimaryGeneratedColumn, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class DiscordLink {
	@PrimaryGeneratedColumn('increment')
	public id!: string;

	@OneToOne(() => User, user => user.discord)
	public user!: User;

	@PrimaryColumn('varchar')
	public discordID!: string;
}
