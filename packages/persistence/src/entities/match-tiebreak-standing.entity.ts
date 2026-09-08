import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";

import { MatchTiebreak } from "./match-tiebreak.entity";
import { Player } from "./player.entity";
import { Score } from "./score.entity";

@Entity()
@Index("UQ_match_tiebreak_standing_player", ["tiebreak", "player"], { unique: true })
@Index("IDX_match_tiebreak_standing_player_lookup", ["player"])
export class MatchTiebreakStanding {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => MatchTiebreak, (tiebreak) => tiebreak.standings, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "tiebreakId", foreignKeyConstraintName: "FK_match_tiebreak_standing_tiebreak" })
    tiebreak: MatchTiebreak;

    @ManyToOne(() => Player, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "playerId", foreignKeyConstraintName: "FK_match_tiebreak_standing_player" })
    player: Player;

    @OneToOne(() => Score, { nullable: true })
    @JoinColumn({ name: "scoreId", foreignKeyConstraintName: "FK_match_tiebreak_standing_score" })
    score?: Score | null;

    @Column({ nullable: true })
    manualPoints?: number | null;
}
