import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ExternalProvider = 'startgg';
export type ExternalMappingLocalType =
  | 'account'
  | 'player'
  | 'participant'
  | 'entrant'
  | 'tournament'
  | 'division'
  | 'phase'
  | 'phaseGroup'
  | 'match';
export type ExternalMappingExternalType =
  | 'user'
  | 'player'
  | 'participant'
  | 'entrant'
  | 'tournament'
  | 'event'
  | 'phase'
  | 'phaseGroup'
  | 'set'
  | 'seed';

@Entity()
@Index('UQ_external_mapping_identity', ['provider', 'localType', 'localId', 'externalType', 'externalId'], { unique: true })
export class ExternalMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  provider: ExternalProvider;

  @Column()
  localType: ExternalMappingLocalType;

  @Column()
  localId: string;

  @Column()
  externalType: ExternalMappingExternalType;

  @Column()
  externalId: string;

  @Column({ nullable: true, default: null })
  externalSlug?: string | null;

  @Column({ type: 'simple-json', nullable: true, default: null })
  metadata?: Record<string, unknown> | null;
}
