import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Match } from './match.entity';
import { Phase } from './phase.entity';
import { PhaseGroupEntrant } from './phase-group-entrant.entity';

export type PhaseGroupState = 'pending' | 'active' | 'completed';

@Entity()
@Index('IDX_phase_group_phase', ['phase'])
export class PhaseGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  displayIdentifier?: string | null;

  @Column({ nullable: true })
  bracketType?: string | null;

  @Column({ default: 'pending' })
  state: PhaseGroupState;

  @ManyToOne(() => Phase, (phase) => phase.phaseGroups, { onDelete: 'CASCADE' })
  @JoinColumn()
  phase: Phase;

  @OneToMany(() => Match, (match) => match.phaseGroup)
  matches: Match[];

  @OneToMany(() => PhaseGroupEntrant, (phaseGroupEntrant) => phaseGroupEntrant.phaseGroup, { cascade: true })
  entrants: PhaseGroupEntrant[];
}
