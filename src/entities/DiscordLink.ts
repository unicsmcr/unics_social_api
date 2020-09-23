import { PrimaryGeneratedColumn, Entity, OneToOne, PrimaryColumn, JoinColumn, Unique } from 'typeorm';
import { User } from './User';

@Entity()
@Unique(['discordID'])
export class DiscordLink {
	@PrimaryGeneratedColumn('increment')
	public id!: string;

	@OneToOne(() => User, user => user.discord)
	@JoinColumn()
	public user!: User;

	@PrimaryColumn('varchar')
	public discordID!: string;
}
