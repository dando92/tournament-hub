import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Match } from './match.entity';

export type MatchResultEntry = {
  playerId: number;
  points: number;
  placement: number;
};

@Entity()
export class MatchResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'jsonb' })
  playerPoints: MatchResultEntry[];

  @OneToOne(() => Match, (match) => match.matchResult, { onDelete: 'CASCADE' })
  match: Match;
}
