import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { Match } from "./match.entity";
import { Schedule } from "./schedule.entity";

@Entity()
@Index("UQ_schedule_entry_position", ["schedule", "position"], { unique: true })
@Index("UQ_schedule_entry_match", ["match"], { unique: true })
export class ScheduleEntry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    position: number;

    @Column({ type: "integer" })
    expectedDurationMinutes: number;

    @Column({ type: "timestamptz", nullable: true })
    startedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true })
    completedAt: Date | null;

    @ManyToOne(() => Schedule, (schedule) => schedule.entries, { onDelete: "CASCADE" })
    @JoinColumn({ name: "scheduleId", foreignKeyConstraintName: "FK_schedule_entry_schedule" })
    schedule: Schedule;

    @ManyToOne(() => Match, { onDelete: "CASCADE" })
    @JoinColumn({ name: "matchId", foreignKeyConstraintName: "FK_schedule_entry_match" })
    match: Match;
}
