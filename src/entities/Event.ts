import { PrimaryGeneratedColumn, Entity, Column } from 'typeorm';

@Entity()
export class Event {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column()
	public title!: string;

	@Column('date')
	public startTime!: Date;

	@Column('date')
	public endTime!: Date;

	@Column()
	public description!: string;

	@Column()
	public external!: string;
}
