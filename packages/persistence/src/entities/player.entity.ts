import {
  Entity,
  Check,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne } from 'typeorm';

import { Score } from './score.entity'
import { Account } from './account.entity';
import { Participant } from './participant.entity';

@Entity()
@Check('CHK_player_nationality', `"nationality" = '' OR "nationality" ~ '^[A-Z]{2}$'`)
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  playerName: string;

  @Column({ type: 'varchar', length: 2, default: '' })
  nationality: string;

  @OneToOne(() => Account, (account) => account.player)
  account: Account;

  @OneToMany(() => Score, (score) => score.player, { cascade: true })
  scores: Score[];

  @OneToMany(() => Participant, (participant) => participant.player)
  participants: Participant[];
}
