import { PrimaryGeneratedColumn, Entity, Column } from 'typeorm';
import { MaxLength } from 'class-validator';

@Entity()
export class Event {
	@PrimaryGeneratedColumn('uuid')
	public id!: string;

	@Column()
	@MaxLength(50, { message: 'An event title must be 50 characters at most' })
	public title!: string;

	@Column('date')
	public startTime!: Date;

	@Column('date')
	public endTime!: Date;

	@Column()
	@MaxLength(2000, { message: 'An event description must be 2000 characters at most' })
	public description!: string;

	@Column()
	public external!: string;
}
