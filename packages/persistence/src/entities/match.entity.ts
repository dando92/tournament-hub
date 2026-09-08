import {
  Entity,
  Index,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  ManyToMany,
  JoinTable,
  JoinColumn } from 'typeorm';
import type { ScoringSystemType } from '@tournament-hub/scoring';

import { Round } from './round.entity'
import { Entrant } from './entrant.entity'
import { MatchResult } from './match_result.entity'
import { PhaseGroup } from './phase-group.entity'
import { MatchTiebreak } from './match-tiebreak.entity'

export type MatchState = 'open' | 'partial' | 'ready' | 'tiebreak_required' | 'completed';

@Entity()
@Index('IDX_match_phase_group', ['phaseGroup'])
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ nullable: true })
  notes: string;

  @Column()
  scoringSystem: ScoringSystemType;

  @Column({ default: false })
  active: boolean;

  @Column({ default: 'open' })
  state: MatchState;

  @ManyToMany(() => Entrant, (entrant) => entrant.matches, { nullable: true })
  @JoinTable()
  entrants?: Entrant[];

  @OneToMany(() => Round, (round) => round.match, { cascade: true  })
  rounds: Round[];

  @OneToMany(() => MatchTiebreak, (tiebreak) => tiebreak.match, { cascade: true })
  tiebreaks: MatchTiebreak[];

  @OneToOne(() => MatchResult, (matchResult) => matchResult.match, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn()
  matchResult?: MatchResult | null;

  @ManyToOne(() => PhaseGroup, (phaseGroup) => phaseGroup.matches, { onDelete: 'CASCADE' })
  @JoinColumn()
  phaseGroup: PhaseGroup;
}
