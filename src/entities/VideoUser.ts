import { Entity, ManyToOne, Column } from 'typeorm';
import { User } from './User';
import { VideoIntegration } from './VideoIntegration';

@Entity()
export class VideoUser {
	@ManyToOne(() => User, { primary: true })
	public user!: User;

	@ManyToOne(() => VideoIntegration, videoIntegration => videoIntegration.videoUsers, { primary: true })
	public videoIntegration!: VideoIntegration;

	@Column()
	public accessToken!: string;
}
