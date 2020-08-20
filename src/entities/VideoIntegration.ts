import { Column, PrimaryGeneratedColumn, Entity, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { VideoUser } from './VideoUser';
import { DMChannel } from './Channel';

@Entity()
export class VideoIntegration {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column('timestamp')
	public creationTime!: Date;

	@Column('timestamp')
	public endTime!: Date;

	@OneToMany(() => VideoUser, videoUser => videoUser.videoIntegration, { eager: true, cascade: true })
	@JoinColumn()
	public videoUsers!: VideoUser[];

	@OneToOne(() => DMChannel, channel => channel.videoIntegration)
	public dmChannel!: DMChannel;
}
