import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn } from 'typeorm';

import { Score } from './score.entity'
import { Round } from './round.entity'
import { Player } from './player.entity'

@Entity()
@Index(['round', 'player'], { unique: true })
@Index('IDX_standing_player', ['player'])
export class Standing {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Score, { nullable: true })
  @JoinColumn()
  score?: Score | null

  @ManyToOne(() => Player, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn()
  player: Player;

  @Column()
  points: number;

  @ManyToOne(() => Round, (round) => round.standings, { onDelete: 'CASCADE' })
  round: Round
}
