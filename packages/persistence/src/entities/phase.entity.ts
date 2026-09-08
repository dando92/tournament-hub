import {
  Entity,
  Index,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

import { Division } from './division.entity';
import { PhaseGroup } from './phase-group.entity';

@Entity()
@Index('IDX_phase_division', ['division'])
export class Phase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => PhaseGroup, (phaseGroup) => phaseGroup.phase, { cascade: true })
  phaseGroups: PhaseGroup[];

  @ManyToOne(() => Division, (division) => division.phases, { onDelete: 'CASCADE' })
  division: Division;
}
