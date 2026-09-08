import { ConflictException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { ScheduleRunner } from "./schedule.runner";
import { ScheduleStore } from "./schedule.store";

type RollbackSchedule = {
    scheduleId: number;
    scheduleName: string;
    status: "running";
    matchPosition: number;
    currentPosition: number;
};

type CompletedSchedule = {
    scheduleId: number;
    scheduleName: string;
    entryId: number;
};

const ROLLBACK_SCHEDULE_OF_MATCH = `
    SELECT      s."id" AS "scheduleId",
                s."name" AS "scheduleName",
                s."status" AS "status",
                target."position" AS "matchPosition",
                current."position" AS "currentPosition"
    FROM        "schedule_entry" target
    JOIN        "schedule" s ON s."id" = target."scheduleId"
    LEFT JOIN   "schedule_entry" current ON current."id" = s."currentEntryId"
    WHERE       target."matchId" = $1
        AND     s."status" = 'running'
        AND     (current."position" IS NULL OR target."position" <= current."position")
`;

const COMPLETED_SCHEDULE_OF_MATCH = `
    SELECT  s."id" AS "scheduleId",
            s."name" AS "scheduleName",
            entry."id" AS "entryId"
    FROM    "schedule_entry" entry
    JOIN    "schedule" s ON s."id" = entry."scheduleId"
    WHERE   entry."matchId" = $1
        AND s."status" = 'completed'
`;

@Injectable()
export class ScheduleMutationGuard {
    constructor(
        private readonly dataSource: DataSource,
        private readonly store: ScheduleStore,
        private readonly runner: ScheduleRunner,
    ) {}

    async assertManualActivationAllowed(tournamentId: number): Promise<void> {
        const scheduleIds = await this.store.operationalScheduleIds(tournamentId);
        if (scheduleIds.length > 0) {
            throw new ConflictException({
                code: "MANUAL_ACTIVATION_DISABLED_BY_SCHEDULE",
                message: "Manual match activation is unavailable while a schedule is running",
                scheduleIds,
            });
        }
    }

    async protectRollback(matchId: number, confirmed: boolean): Promise<void> {
        const affected = await this.rollbackSchedule(matchId);
        if (!affected) {
            return;
        }
        if (!confirmed) {
            throw new ConflictException({
                code: "SCHEDULE_STOP_CONFIRMATION_REQUIRED",
                message: `This change will stop schedule "${affected.scheduleName}"`,
                scheduleId: affected.scheduleId,
                scheduleName: affected.scheduleName,
                matchId,
            });
        }

        await this.runner.stop(affected.scheduleId, "ROLLBACK_CONFIRMED", { matchId });
    }

    async prepareResultReopen(matchId: number, confirmed: boolean): Promise<void> {
        const completed = await this.completedSchedule(matchId);
        if (completed) {
            if (!confirmed) {
                throw new ConflictException({
                    code: "SCHEDULE_STOP_CONFIRMATION_REQUIRED",
                    message: `Reopening this result will reopen completed schedule "${completed.scheduleName}" at this match`,
                    scheduleId: completed.scheduleId,
                    scheduleName: completed.scheduleName,
                    matchId,
                });
            }
            await this.runner.interruptCompleted(completed.scheduleId, completed.entryId, matchId);
            return;
        }

        await this.protectRollback(matchId, confirmed);
    }

    private async rollbackSchedule(matchId: number): Promise<RollbackSchedule | null> {
        const rows: RollbackSchedule[] = await this.dataSource.query(ROLLBACK_SCHEDULE_OF_MATCH, [matchId]);

        return rows[0] ?? null;
    }

    private async completedSchedule(matchId: number): Promise<CompletedSchedule | null> {
        const rows: CompletedSchedule[] = await this.dataSource.query(COMPLETED_SCHEDULE_OF_MATCH, [matchId]);

        return rows[0] ?? null;
    }
}
