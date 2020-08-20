import { Column, PrimaryGeneratedColumn, Entity, OneToMany, OneToOne } from 'typeorm';
import { VideoUser } from './VideoUser';
import { DMChannel } from './Channel';

export interface APIVideoIntegration {
	id: string;
	creationTime: string;
	endTime: string;
}

@Entity()
export class VideoIntegration {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column('timestamp')
	public creationTime!: Date;

	@Column('timestamp')
	public endTime!: Date;

	@OneToMany(() => VideoUser, videoUser => videoUser.videoIntegration, { eager: true, cascade: true })
	public videoUsers!: VideoUser[];

	@OneToOne(() => DMChannel, channel => channel.videoIntegration)
	public dmChannel!: DMChannel;

	public toJSON(): APIVideoIntegration {
		return {
			id: this.id,
			creationTime: this.creationTime.toISOString(),
			endTime: this.endTime.toISOString()
		};
	}
}
