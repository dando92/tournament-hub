import { Injectable } from "@nestjs/common";

import { UiUpdatePublisher } from "@tournament/shared/ui-update.publisher";
import { ScheduleRunner } from "./schedule.runner";
import { ScheduleStore } from "./schedule.store";

@Injectable()
export class ScheduleCommands {
    constructor(
        private readonly store: ScheduleStore,
        private readonly runner: ScheduleRunner,
        private readonly publisher: UiUpdatePublisher,
    ) {}

    async create(tournamentId: number, name: string, willStartAt: Date, defaultExpectedDurationMinutes: number, matchIds: number[]): Promise<number> {
        const scheduleId = await this.store.create(tournamentId, name, willStartAt, defaultExpectedDurationMinutes, matchIds);
        await this.publisher.emitScheduleUpdate(tournamentId, scheduleId);

        return scheduleId;
    }

    async updateDetails(scheduleId: number, name: string, willStartAt: Date): Promise<void> {
        const schedule = await this.store.loadOrFail(scheduleId);
        schedule.updateDetails(name, willStartAt);
        await this.store.save(schedule);
        await this.publisher.emitScheduleUpdate(schedule.tournamentId, schedule.id);
    }

    async remove(scheduleId: number): Promise<void> {
        const schedule = await this.store.loadOrFail(scheduleId);
        const tournamentId = schedule.tournamentId;
        await this.store.remove(schedule);
        await this.publisher.emitScheduleUpdate(tournamentId, scheduleId);
    }

    async replaceEntries(scheduleId: number, version: number, entries: Array<{ matchId: number; expectedDurationMinutes: number }>): Promise<void> {
        const schedule = await this.store.loadOrFail(scheduleId);
        await this.store.replaceEntries(scheduleId, version, entries);
        await this.publisher.emitScheduleUpdate(schedule.tournamentId, scheduleId);
    }

    async updateExpectedDuration(scheduleId: number, entryId: number, expectedDurationMinutes: number): Promise<void> {
        const tournamentId = await this.store.updateExpectedDuration(scheduleId, entryId, expectedDurationMinutes);
        await this.publisher.emitScheduleUpdate(tournamentId, scheduleId);
    }

    async start(scheduleId: number, entryId?: number): Promise<void> {
        const schedule = await this.store.loadOrFail(scheduleId);
        schedule.start(entryId);
        await this.store.save(schedule);
        await this.runner.deactivateEveryMatch(scheduleId);
        await this.runner.recalculate(scheduleId);
    }

    async stop(scheduleId: number): Promise<void> {
        await this.runner.stop(scheduleId);
    }

    async archive(scheduleId: number): Promise<void> {
        const schedule = await this.store.loadOrFail(scheduleId);
        schedule.archive();
        await this.store.save(schedule);
        await this.publisher.emitScheduleUpdate(schedule.tournamentId, scheduleId);
    }

    async unarchive(scheduleId: number): Promise<void> {
        const schedule = await this.store.loadOrFail(scheduleId);
        schedule.unarchive();
        await this.store.save(schedule);
        await this.publisher.emitScheduleUpdate(schedule.tournamentId, scheduleId);
    }
}
