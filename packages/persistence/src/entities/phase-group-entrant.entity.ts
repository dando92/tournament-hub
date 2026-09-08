import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AdvancementRule } from './advancement-rule.entity';
import { Entrant } from './entrant.entity';
import { PhaseGroup } from './phase-group.entity';

export type PhaseGroupEntrantStatus = 'pending' | 'active' | 'advanced' | 'eliminated' | 'withdrawn' | 'dq';

@Entity()
@Index('IDX_phase_group_entrant_phase_group', ['phaseGroup'])
@Index('IDX_phase_group_entrant_entrant', ['entrant'])
@Index('IDX_phase_group_entrant_source_advancement_rule', ['sourceAdvancementRule'])
export class PhaseGroupEntrant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PhaseGroup, (phaseGroup) => phaseGroup.entrants, { onDelete: 'CASCADE' })
  @JoinColumn()
  phaseGroup: PhaseGroup;

  @ManyToOne(() => Entrant, (entrant) => entrant.phaseGroupEntrants, { onDelete: 'CASCADE' })
  @JoinColumn()
  entrant: Entrant;

  @Column({ nullable: true })
  seedNum?: number | null;

  @Column({ nullable: true })
  slot?: number | null;

  @Column({ default: 'active' })
  status: PhaseGroupEntrantStatus;

  @ManyToOne(() => AdvancementRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  sourceAdvancementRule?: AdvancementRule | null;
}
