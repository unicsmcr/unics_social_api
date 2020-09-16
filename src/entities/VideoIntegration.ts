import { Column, PrimaryGeneratedColumn, Entity, OneToMany, OneToOne } from 'typeorm';
import { VideoUser } from './VideoUser';
import { DMChannel } from './Channel';

export interface APIVideoIntegration {
	id: string;
	creationTime: string;
	endTime: string;
	users?: {
		id: string;
		accessToken: string;
	}[];
}

@Entity()
export class VideoIntegration {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column('timestamptz')
	public creationTime!: Date;

	@Column('timestamptz')
	public endTime!: Date;

	@OneToMany(() => VideoUser, videoUser => videoUser.videoIntegration, { eager: true, cascade: true })
	public videoUsers!: VideoUser[];

	@OneToOne(() => DMChannel, channel => channel.videoIntegration)
	public dmChannel!: DMChannel;

	public toJSON(filter?: (videoUser: VideoUser) => boolean): APIVideoIntegration {
		return {
			id: this.id,
			creationTime: this.creationTime.toISOString(),
			endTime: this.endTime.toISOString(),
			users: this.videoUsers.filter(filter ?? Boolean).map(videoUser => ({
				id: videoUser.user.id,
				accessToken: videoUser.accessToken
			}))
		};
	}
}
