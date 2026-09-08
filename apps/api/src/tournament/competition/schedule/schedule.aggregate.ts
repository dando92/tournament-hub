import { ConflictException } from "@nestjs/common";
import { Schedule, ScheduleEntry, Tournament } from "@tournament-hub/persistence";
import type { ScheduleInterruptionCode, ScheduleStaleCode, ScheduleStaleDetails } from "@tournament-hub/contracts";

export class ScheduleAggregate {
    private constructor(private readonly schedule: Schedule) {}

    static of(schedule: Schedule): ScheduleAggregate {
        return new ScheduleAggregate(schedule);
    }

    static create(name: string, willStartAt: Date, tournament: Tournament): ScheduleAggregate {
        const schedule = new Schedule();
        schedule.name = name.trim();
        schedule.willStartAt = willStartAt;
        schedule.status = "inactive";
        schedule.currentEntryId = null;
        schedule.staleCode = null;
        schedule.staleDetails = null;
        schedule.interruptionCode = null;
        schedule.interruptionDetails = null;
        schedule.interruptedAt = null;
        schedule.archivedAt = null;
        schedule.tournament = tournament;
        schedule.entries = [];

        return new ScheduleAggregate(schedule);
    }

    get id(): number {
        return this.schedule.id;
    }

    get entity(): Schedule {
        return this.schedule;
    }

    get tournamentId(): number {
        return this.schedule.tournament?.id;
    }

    get status() {
        return this.schedule.status;
    }

    get currentEntryId(): number | null {
        return this.schedule.currentEntryId;
    }

    get entries(): ScheduleEntry[] {
        return [...(this.schedule.entries ?? [])].sort((left, right) => left.position - right.position);
    }

    assertEditable(): void {
        if (this.schedule.status !== "inactive" || this.schedule.archivedAt) {
            throw new ConflictException(`Schedule ${this.schedule.id} is not editable`);
        }
    }

    rename(name: string): void {
        this.assertEditable();
        this.schedule.name = name.trim();
    }

    updateDetails(name: string, willStartAt: Date): void {
        this.assertEditable();
        this.schedule.name = name.trim();
        this.schedule.willStartAt = willStartAt;
    }

    start(entryId?: number): void {
        this.assertEditable();
        if (entryId !== undefined && !this.entries.some((entry) => entry.id === entryId)) {
            throw new ConflictException(`Entry ${entryId} does not belong to schedule ${this.schedule.id}`);
        }
        this.schedule.currentEntryId = entryId ?? null;
        this.schedule.status = "running";
        this.clearStale();
        this.clearInterruption();
    }

    stop(interruptionCode?: ScheduleInterruptionCode, interruptionDetails?: Record<string, unknown>): void {
        if (this.schedule.status !== "running") {
            throw new ConflictException(`Schedule ${this.schedule.id} is not running`);
        }
        this.schedule.status = "inactive";
        this.clearStale();
        if (interruptionCode) {
            this.interrupt(interruptionCode, interruptionDetails);
        } else {
            this.clearInterruption();
        }
    }

    interruptCompletedRun(entryId: number, interruptionCode: ScheduleInterruptionCode, interruptionDetails?: Record<string, unknown>): void {
        if (this.schedule.status !== "completed") {
            throw new ConflictException(`Schedule ${this.schedule.id} is not completed`);
        }
        this.schedule.status = "inactive";
        this.schedule.currentEntryId = entryId;
        this.schedule.archivedAt = null;
        this.clearStale();
        this.interrupt(interruptionCode, interruptionDetails);
    }

    waitAt(entryId: number, code: ScheduleStaleCode, details: ScheduleStaleDetails): void {
        this.schedule.currentEntryId = entryId;
        this.schedule.staleCode = code;
        this.schedule.staleDetails = details;
    }

    activate(entryId: number): void {
        this.schedule.currentEntryId = entryId;
        this.clearStale();
    }

    complete(): void {
        this.schedule.status = "completed";
        this.schedule.currentEntryId = null;
        this.clearStale();
    }

    archive(): void {
        if (this.schedule.status !== "completed") {
            throw new ConflictException(`Only completed schedules can be archived`);
        }
        this.schedule.archivedAt = new Date();
    }

    unarchive(): void {
        if (this.schedule.status !== "completed") {
            throw new ConflictException(`Only completed schedules can be unarchived`);
        }
        this.schedule.archivedAt = null;
    }

    replaceEntries(entries: ScheduleEntry[]): void {
        this.assertEditable();
        this.schedule.entries = entries;
        if (this.schedule.currentEntryId && !entries.some((entry) => entry.id === this.schedule.currentEntryId)) {
            this.schedule.currentEntryId = null;
        }
    }

    private clearStale(): void {
        this.schedule.staleCode = null;
        this.schedule.staleDetails = null;
    }

    private interrupt(code: ScheduleInterruptionCode, details?: Record<string, unknown>): void {
        this.schedule.interruptionCode = code;
        this.schedule.interruptionDetails = details ?? null;
        this.schedule.interruptedAt = new Date();
    }

    private clearInterruption(): void {
        this.schedule.interruptionCode = null;
        this.schedule.interruptionDetails = null;
        this.schedule.interruptedAt = null;
    }
}
