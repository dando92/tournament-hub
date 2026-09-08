import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId, VersionColumn } from "typeorm";

import { Tournament } from "./tournament.entity";
import { ScheduleEntry } from "./schedule-entry.entity";

export type ScheduleStatus = "inactive" | "running" | "completed";

@Entity()
@Check("CHK_schedule_status", `"status" IN ('inactive', 'running', 'completed')`)
@Index("IDX_schedule_tournament", ["tournament"])
@Index("IDX_schedule_current_entry", ["currentEntry"])
export class Schedule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: "timestamptz" })
    willStartAt: Date;

    @Column({ type: "varchar", default: "inactive" })
    status: ScheduleStatus;

    @Column({ nullable: true })
    currentEntryId: number | null;

    @ManyToOne(() => ScheduleEntry, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "currentEntryId", foreignKeyConstraintName: "FK_schedule_current_entry" })
    currentEntry: ScheduleEntry | null;

    @Column({ type: "varchar", nullable: true })
    staleCode: string | null;

    @Column({ type: "jsonb", nullable: true })
    staleDetails: Record<string, unknown> | null;

    @Column({ type: "varchar", nullable: true })
    interruptionCode: string | null;

    @Column({ type: "jsonb", nullable: true })
    interruptionDetails: Record<string, unknown> | null;

    @Column({ type: "timestamptz", nullable: true })
    interruptedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true })
    archivedAt: Date | null;

    @VersionColumn()
    version: number;

    @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournamentId", foreignKeyConstraintName: "FK_schedule_tournament" })
    tournament: Tournament;

    @RelationId((schedule: Schedule) => schedule.tournament)
    tournamentId: number;

    @OneToMany(() => ScheduleEntry, (entry) => entry.schedule)
    entries: ScheduleEntry[];
}
