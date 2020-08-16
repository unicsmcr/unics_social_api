import { Column, PrimaryGeneratedColumn, Entity, OneToMany } from 'typeorm';
import { VideoUser } from './VideoUser';

@Entity()
export class VideoIntegration {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column('timestamp')
	public creationTime!: Date;

	@Column('timestamp')
	public endTime!: Date;

	@OneToMany(() => VideoUser, videoUser => videoUser.videoIntegration, { eager: true })
	public videoUsers!: VideoUser[];
}
