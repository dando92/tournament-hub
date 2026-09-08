import {
  Entity,
  Column,
  Check,
  Index,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import type { ScoringSystemType } from '@tournament-hub/scoring';

import { Division } from './division.entity';
import { Song } from './song.entity';
import { Participant } from './participant.entity';

export type TournamentStatus = 'open' | 'closed';

@Entity()
@Check('CHK_tournament_status', `"status" IN ('open', 'closed')`)
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'open' })
  status: TournamentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ nullable: true, default: null })
  startggApiKey: string | null;

  @Column({ default: 0 })
  planVersion: number;

  @Index('UQ_tournament_control_room_key_hash', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  controlRoomKeyHash: string | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  controlRoomKeyIssuedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  controlRoomKeyLastUsedAt: Date | null;

  @Column({ default: 'PlacementPointsWithFailZero' })
  defaultScoringSystem: ScoringSystemType;

  @OneToMany(() => Division, (division) => division.tournament, { cascade: true })
  divisions: Division[]

  @OneToMany(() => Participant, (participant) => participant.tournament, { cascade: true })
  participants: Participant[];

  @OneToMany(() => Song, (song) => song.tournament, { eager: false })
  songs: Promise<Song[]>;
}
