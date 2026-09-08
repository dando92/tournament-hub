import { Check, Entity, Column, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { Song } from './song.entity';
import { Player } from './player.entity';

export type ScoreSource = 'manual' | 'control-room';

@Entity()
@Index('IDX_score_song_player_id', ['song', 'player', 'id'])
@Check('CHK_score_source', `"source" IN ('manual', 'control-room')`)
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  percentage: number;

  @Column()
  isFailed: boolean;

  @Column({ type: 'varchar', default: 'manual' })
  source: ScoreSource;

  @ManyToOne(() => Song, (song) => song.scores, { onDelete: 'CASCADE' })
  song: Song;

  @ManyToOne(() => Player, (player) => player.scores, { onDelete: 'CASCADE' })
  player: Player;
}
