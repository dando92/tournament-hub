import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AdvancementCompetitionKind = 'match' | 'phase_group';

@Entity()
@Index('IDX_advancement_rule_source', ['sourceKind', 'sourceId'])
@Index('IDX_advancement_rule_target', ['targetKind', 'targetId'])
export class AdvancementRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  sourceKind: AdvancementCompetitionKind;

  @Column()
  sourceId: number;

  @Column()
  sourcePlacement: number;

  @Column({ type: 'varchar' })
  targetKind: AdvancementCompetitionKind;

  @Column()
  targetId: number;

  @Column()
  targetSlot: number;
}
