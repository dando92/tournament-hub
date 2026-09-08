import {
  Entity,
  Index,
  Check,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne } from 'typeorm';

import { Score } from './score.entity'
import { Round } from './round.entity'
import { Tournament } from './tournament.entity'

export type ChartDifficulty = 'Novice' | 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Edit';

@Entity()
@Check('CHK_song_chart_difficulty', `"chartDifficulty" IN ('Novice', 'Easy', 'Medium', 'Hard', 'Expert', 'Edit')`)
@Index('IDX_song_tournament', ['tournament'])
export class Song {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  artist: string;

  @Column()
  group: string;

  @Column()
  difficulty: number;

  @Column({ type: 'varchar', nullable: true })
  chartDifficulty: ChartDifficulty | null;

  @OneToMany(() => Score, (score) => score.song, { cascade: true })
  scores: Score[]

  @OneToMany(() => Round, (round) => round.song, { cascade: true })
  rounds: Round[]

  @ManyToOne(() => Tournament, (tournament) => tournament.songs, { nullable: true, onDelete: 'SET NULL', eager: false })
  tournament: Tournament | null
}
