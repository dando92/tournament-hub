import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Division } from './division.entity';
import { Match } from './match.entity';
import { Participant } from './participant.entity';
import { PhaseGroupEntrant } from './phase-group-entrant.entity';

export type EntrantType = 'player' | 'team';
export type EntrantStatus = 'active' | 'dropped' | 'withdrawn' | 'dq' | 'unknown';

@Entity()
@Index('IDX_entrant_division', ['division'])
export class Entrant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Division, (division) => division.entrants, { onDelete: 'CASCADE' })
  division: Division;

  @Column()
  name: string;

  @Column({ default: 'player' })
  type: EntrantType;

  @Column({ default: 'active' })
  status: EntrantStatus;

  @Column({ nullable: true })
  seedNum?: number | null;

  @ManyToMany(() => Participant, (participant) => participant.entrants)
  @JoinTable()
  participants: Participant[];

  @ManyToMany(() => Match, (match) => match.entrants)
  matches: Match[];

  @OneToMany(() => PhaseGroupEntrant, (phaseGroupEntrant) => phaseGroupEntrant.entrant)
  phaseGroupEntrants: PhaseGroupEntrant[];
}
