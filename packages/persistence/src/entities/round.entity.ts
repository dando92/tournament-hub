import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn } from 'typeorm';

import { Match } from './match.entity'
import { Standing } from './standing.entity'
import { Song } from './song.entity'


@Entity()
@Index(['match', 'song'], { unique: true })
@Index(['match'], { unique: true, where: '"songId" IS NULL' })
@Index('IDX_round_song', ['song'])
export class Round {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Standing, (standing) => standing.round, { cascade: true })
  standings: Standing[]

  @ManyToOne(() => Match, (match) => match.rounds, { onDelete: 'CASCADE' })
  match: Match;

  @ManyToOne(() => Song, (song) => song.rounds, { onDelete: 'CASCADE', nullable: true })
  song?: Song | null;
}
