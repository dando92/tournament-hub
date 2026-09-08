import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Account } from './account.entity';
import { Entrant } from './entrant.entity';
import { Player } from './player.entity';
import { Tournament } from './tournament.entity';

export type ParticipantRole = 'competitor' | 'spectator' | 'owner' | 'staff' | 'unknown';
export type ParticipantStatus = 'registered' | 'checked_in' | 'withdrawn' | 'unknown';

@Entity()
@Index('UQ_participant_tournament_player', ['tournament', 'player'], { unique: true })
@Index('IDX_participant_player', ['player'])
@Index('IDX_participant_account', ['account'])
export class Participant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.participants, { onDelete: 'CASCADE' })
  @JoinColumn()
  tournament: Tournament;

  @ManyToOne(() => Player, (player) => player.participants, { nullable: false })
  @JoinColumn()
  player: Player;

  @ManyToOne(() => Account, (account) => account.participants, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  account?: Account | null;

  @Column({ type: 'text', array: true, default: () => `'{unknown}'` })
  roles: ParticipantRole[];

  @Column({ default: 'registered' })
  status: ParticipantStatus;

  @ManyToMany(() => Entrant, (entrant) => entrant.participants)
  entrants: Entrant[];
}
