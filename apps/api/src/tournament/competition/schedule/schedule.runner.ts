import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { Schedule, ScheduleEntry, Match, Tournament } from "@tournament-hub/persistence";
import type { MatchState } from "@tournament-hub/persistence";
import type { ScheduleInterruptionCode } from "@tournament-hub/contracts";

import { MatchAddress } from "@match/match.aggregate";
import { UiUpdatePublisher } from "@tournament/shared/ui-update.publisher";
import { ScheduleAggregate } from "./schedule.aggregate";
import { ScheduleConflicts, ScheduleMatchSnapshot, evaluateConflicts, evaluateLocalEligibility } from "./schedule.eligibility";

type ScheduleTransition = { tournamentId: number; scheduleId: number; matchAddresses: MatchAddress[] };

const SCHEDULE_ID_OF_MATCH = `
    SELECT  entry."scheduleId" AS "scheduleId"
    FROM    "schedule_entry" entry
    WHERE   entry."matchId" = $1
`;

const SCHEDULE_IDS_OF_MATCHES = `
    SELECT DISTINCT entry."scheduleId" AS "scheduleId"
    FROM    "schedule_entry" entry
    WHERE   entry."matchId" = ANY($1::int[])
`;

const OPERATIONAL_SCHEDULE_IDS_OF_TOURNAMENT = `
    SELECT  s."id" AS "id"
    FROM    "schedule" s
    WHERE   s."tournamentId" = $1
        AND s."status" = 'running'
`;

const RUNNING_SCHEDULE_IDS = `
    SELECT   s."id" AS "id"
    FROM     "schedule" s
    WHERE    s."status" = 'running'
    ORDER BY s."id"
`;

type ScheduleEntryRow = {
    entryId: number;
    entryMatchId: number;
    startedAt: Date | null;
    completedAt: Date | null;
    matchId: number | null;
    matchName: string | null;
    active: boolean | null;
    state: MatchState | null;
    tournamentId: number | null;
    divisionId: number | null;
    phaseId: number | null;
    phaseGroupId: number | null;
    roundCount: number;
    playerIds: number[] | null;
    requiredEntrantCount: number;
    pendingRuleCount: number;
};

const SCHEDULE_ENTRY_SNAPSHOTS = `
    SELECT      entry."id"          AS "entryId",
                entry."matchId"     AS "entryMatchId",
                entry."startedAt"   AS "startedAt",
                entry."completedAt" AS "completedAt",
                m."id"              AS "matchId",
                m."name"            AS "matchName",
                m."active"          AS "active",
                m."state"           AS "state",
                ca."tournamentId"   AS "tournamentId",
                ca."divisionId"     AS "divisionId",
                ca."phaseId"        AS "phaseId",
                ca."phaseGroupId"   AS "phaseGroupId",
                COALESCE(rounds."count", 0)::int AS "roundCount",
                players."ids" AS "playerIds",
                GREATEST(COALESCE(slots."required", 0), 2)::int AS "requiredEntrantCount",
                COALESCE(slots."pending", 0)::int AS "pendingRuleCount"
    FROM        "schedule_entry" entry
    LEFT JOIN   "match" m ON m."id" = entry."matchId"
    LEFT JOIN   "competition_address" ca ON ca."matchId" = m."id"
    LEFT JOIN   LATERAL (
                    SELECT  COUNT(*) AS "count"
                    FROM    "round" r
                    WHERE   r."matchId" = m."id"
                ) rounds ON TRUE
    LEFT JOIN   LATERAL (
                    SELECT  array_agg(seat."playerId" ORDER BY seat."entrantId") AS "ids"
                    FROM (
                        SELECT DISTINCT ON (e."id") e."id" AS "entrantId", pa."playerId"
                        FROM    "match_entrants_entrant" me
                        JOIN    "entrant" e ON e."id" = me."entrantId" AND e."type" = 'player'
                        JOIN    "entrant_participants_participant" ep ON ep."entrantId" = e."id"
                        JOIN    "participant" pa ON pa."id" = ep."participantId"
                        WHERE   me."matchId" = m."id"
                        ORDER   BY e."id", pa."id"
                    ) seat
                ) players ON TRUE
    LEFT JOIN   LATERAL (
                    SELECT  MAX(target."targetSlot") AS "required",
                            COUNT(*) FILTER (WHERE NOT COALESCE(source."settled", FALSE)) AS "pending"
                    FROM    "advancement_rule" target
                    LEFT JOIN LATERAL (
                        SELECT  CASE target."sourceKind"
                                    WHEN 'match' THEN (SELECT sm."state" = 'completed' FROM "match" sm WHERE sm."id" = target."sourceId")
                                    WHEN 'phase_group' THEN (SELECT pg."state" = 'completed' FROM "phase_group" pg WHERE pg."id" = target."sourceId")
                                END AS "settled"
                    ) source ON TRUE
                    WHERE   target."targetKind" = 'match' AND target."targetId" = m."id"
                ) slots ON TRUE
    WHERE       entry."scheduleId" = $1
    ORDER BY    entry."position"
`;

type MatchAddressRow = {
    tournamentId: number;
    divisionId: number;
    phaseId: number;
    phaseGroupId: number;
    matchId: number;
};

const ACTIVE_MATCH_OF_ENTRY = `
    SELECT  ca."tournamentId" AS "tournamentId",
            ca."divisionId"   AS "divisionId",
            ca."phaseId"      AS "phaseId",
            ca."phaseGroupId" AS "phaseGroupId",
            ca."matchId"      AS "matchId"
    FROM    "schedule_entry" entry
    JOIN    "match" m ON m."id" = entry."matchId" AND m."active" = TRUE
    JOIN    "competition_address" ca ON ca."matchId" = m."id"
    WHERE   entry."id" = $1
`;

const ACTIVE_MATCHES_OF_SCHEDULE = `
    SELECT  ca."tournamentId" AS "tournamentId",
            ca."divisionId"   AS "divisionId",
            ca."phaseId"      AS "phaseId",
            ca."phaseGroupId" AS "phaseGroupId",
            ca."matchId"      AS "matchId"
    FROM    "schedule_entry" entry
    JOIN    "match" m ON m."id" = entry."matchId" AND m."active" = TRUE
    JOIN    "competition_address" ca ON ca."matchId" = m."id"
    WHERE   entry."scheduleId" = $1
`;

type ActiveConflictRow = { matchId: number; playerId: number };

const ACTIVE_CONFLICTS = `
    SELECT DISTINCT other."id" AS "matchId",
            participant."playerId" AS "playerId"
    FROM    "competition_address" ca
    JOIN    "match" other ON other."id" = ca."matchId"
    JOIN    "match_entrants_entrant" me ON me."matchId" = other."id"
    JOIN    "entrant_participants_participant" ep ON ep."entrantId" = me."entrantId"
    JOIN    "participant" ON participant."id" = ep."participantId"
    WHERE   ca."tournamentId" = $1
        AND other."active" = TRUE
        AND other."id" <> ALL($2::int[])
        AND participant."playerId" = ANY($3::int[])
`;

type ScheduleEntrySnapshot = {
    entryId: number;
    entryMatchId: number;
    matchExists: boolean;
    tournamentId: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    address: MatchAddress;
    match: ScheduleMatchSnapshot;
};

@Injectable()
export class ScheduleRunner {
    constructor(
        private readonly dataSource: DataSource,
        private readonly publisher: UiUpdatePublisher,
    ) {}

    async recalculateForMatch(matchId: number): Promise<void> {
        const rows: Array<{ scheduleId: number }> = await this.dataSource.query(SCHEDULE_ID_OF_MATCH, [matchId]);
        if (rows[0]) {
            await this.recalculate(rows[0].scheduleId);
        }
    }

    async recalculateForMatches(matchIds: number[]): Promise<void> {
        if (matchIds.length === 0) {
            return;
        }
        const rows: Array<{ scheduleId: number }> = await this.dataSource.query(SCHEDULE_IDS_OF_MATCHES, [matchIds]);
        for (const { scheduleId } of rows) {
            await this.recalculate(scheduleId);
        }
    }

    async recalculate(scheduleId: number): Promise<void> {
        const transition = await this.dataSource.transaction((manager) => this.recalculateLocked(manager, scheduleId));
        await this.announce(transition);
    }

    async deactivateEveryMatch(scheduleId: number): Promise<void> {
        const addresses = await this.dataSource.transaction(async (manager) => {
            const rows: MatchAddressRow[] = await manager.query(ACTIVE_MATCHES_OF_SCHEDULE, [scheduleId]);
            if (rows.length === 0) {
                return [];
            }
            const addresses = rows.map((row) => this.addressOf(row));
            await manager.update(Match, { id: In(addresses.map((address) => address.matchId)) }, { active: false });

            return addresses;
        });

        for (const address of addresses) {
            await this.publisher.emitMatchUpdate(address);
        }
    }

    async stop(scheduleId: number, interruptionCode?: ScheduleInterruptionCode, interruptionDetails?: Record<string, unknown>): Promise<void> {
        const transition = await this.dataSource.transaction(async (manager) => {
            const schedule = await this.loadScheduleForUpdate(manager, scheduleId);
            const aggregate = ScheduleAggregate.of(schedule);
            aggregate.stop(interruptionCode, interruptionDetails);
            const addresses = await this.deactivateCurrent(manager, schedule);
            await manager.save(Schedule, schedule);

            return { tournamentId: schedule.tournamentId, scheduleId, matchAddresses: addresses };
        });
        await this.announce(transition);
    }

    async interruptCompleted(scheduleId: number, entryId: number, matchId: number): Promise<void> {
        const transition = await this.dataSource.transaction(async (manager) => {
            const schedule = await this.loadScheduleForUpdate(manager, scheduleId);
            const entry = await manager.findOne(ScheduleEntry, { where: { id: entryId, schedule: { id: scheduleId }, match: { id: matchId } } });
            if (!entry) {
                throw new NotFoundException(`Schedule entry ${entryId} not found`);
            }
            ScheduleAggregate.of(schedule).interruptCompletedRun(entryId, "MATCH_RESULT_REOPENED", { matchId });
            await manager.save(Schedule, schedule);

            return { tournamentId: schedule.tournamentId, scheduleId, matchAddresses: [] };
        });
        await this.announce(transition);
    }

    async stopTournament(tournamentId: number): Promise<void> {
        const ids: Array<{ id: number }> = await this.dataSource.query(OPERATIONAL_SCHEDULE_IDS_OF_TOURNAMENT, [tournamentId]);
        for (const { id } of ids) {
            await this.stop(id, "TOURNAMENT_CLOSED", { tournamentId });
        }
    }

    async reconcileRunning(): Promise<void> {
        const rows: Array<{ id: number }> = await this.dataSource.query(RUNNING_SCHEDULE_IDS);
        for (const { id } of rows) {
            await this.recalculate(id);
        }
    }

    private async recalculateLocked(manager: EntityManager, scheduleId: number): Promise<ScheduleTransition> {
        const schedule = await this.loadScheduleForUpdate(manager, scheduleId);
        if (schedule.status !== "running") {
            return { tournamentId: schedule.tournamentId, scheduleId, matchAddresses: [] };
        }

        schedule.tournament = await manager.findOneByOrFail(Tournament, { id: schedule.tournamentId });
        if (schedule.tournament.status !== "open") {
            const addresses = await this.deactivateCurrent(manager, schedule);
            ScheduleAggregate.of(schedule).stop("TOURNAMENT_CLOSED", { tournamentId: schedule.tournamentId });
            await manager.save(Schedule, schedule);

            return { tournamentId: schedule.tournamentId, scheduleId, matchAddresses: addresses };
        }

        const rows: ScheduleEntryRow[] = await manager.query(SCHEDULE_ENTRY_SNAPSHOTS, [scheduleId]);
        const entries = rows.map((row) => this.entryOf(row, schedule.currentEntryId));
        const aggregate = ScheduleAggregate.of(schedule);
        const deactivated: ScheduleEntrySnapshot[] = [];
        const currentIndex = schedule.currentEntryId
            ? Math.max(
                  entries.findIndex((entry) => entry.entryId === schedule.currentEntryId),
                  0,
              )
            : 0;

        for (let index = currentIndex; index < entries.length; index += 1) {
            const entry = entries[index];
            if (!entry.matchExists) {
                aggregate.waitAt(entry.entryId, "MATCH_REMOVED", { matchId: entry.entryMatchId });

                return this.settle(manager, schedule, scheduleId, deactivated, null);
            }
            if (entry.tournamentId !== schedule.tournamentId) {
                aggregate.waitAt(entry.entryId, "MATCH_OUTSIDE_TOURNAMENT", {
                    matchId: entry.match.matchId,
                    matchName: entry.match.matchName,
                });

                return this.settle(manager, schedule, scheduleId, deactivated, null);
            }

            const local = evaluateLocalEligibility(entry.match);
            if (local.kind === "passed") {
                if (!entry.completedAt) {
                    await manager.update(ScheduleEntry, { id: entry.entryId }, { completedAt: new Date() });
                }
                if (entry.match.active) {
                    deactivated.push(entry);
                }
                continue;
            }
            if (local.kind === "stale") {
                aggregate.waitAt(entry.entryId, local.code, local.details);

                return this.settle(manager, schedule, scheduleId, deactivated, null);
            }

            const verdict = evaluateConflicts(entry.match, await this.conflictsOf(manager, schedule.tournamentId, entry, deactivated));
            if (verdict.kind === "stale") {
                aggregate.waitAt(entry.entryId, verdict.code, verdict.details);

                return this.settle(manager, schedule, scheduleId, deactivated, null);
            }

            if (!entry.match.active) {
                await manager.update(ScheduleEntry, { id: entry.entryId }, { startedAt: new Date(), completedAt: null });
            } else if (!entry.startedAt) {
                await manager.update(ScheduleEntry, { id: entry.entryId }, { startedAt: new Date() });
            }
            aggregate.activate(entry.entryId);

            return this.settle(manager, schedule, scheduleId, deactivated, entry.match.active ? null : entry);
        }

        aggregate.complete();

        return this.settle(manager, schedule, scheduleId, deactivated, null);
    }

    private async settle(
        manager: EntityManager,
        schedule: Schedule,
        scheduleId: number,
        deactivated: ScheduleEntrySnapshot[],
        activated: ScheduleEntrySnapshot | null,
    ): Promise<ScheduleTransition> {
        if (deactivated.length > 0) {
            await manager.update(Match, { id: In(deactivated.map((entry) => entry.match.matchId)) }, { active: false });
        }
        if (activated) {
            await manager.update(Match, { id: activated.match.matchId }, { active: true });
        }
        await manager.save(Schedule, schedule);

        const changed = activated ? [...deactivated, activated] : deactivated;

        return { tournamentId: schedule.tournamentId, scheduleId, matchAddresses: changed.map((entry) => entry.address) };
    }

    private entryOf(row: ScheduleEntryRow, currentEntryId: number | null): ScheduleEntrySnapshot {
        const entryId = Number(row.entryId);

        return {
            entryId,
            entryMatchId: Number(row.entryMatchId),
            matchExists: row.matchId !== null,
            tournamentId: row.tournamentId === null ? null : Number(row.tournamentId),
            startedAt: row.startedAt,
            completedAt: row.completedAt,
            address: {
                tournamentId: Number(row.tournamentId),
                divisionId: Number(row.divisionId),
                phaseId: Number(row.phaseId),
                phaseGroupId: Number(row.phaseGroupId),
                matchId: Number(row.matchId),
            },
            match: {
                matchId: Number(row.matchId),
                matchName: row.matchName ?? "",
                active: Boolean(row.active),
                completed: row.state === "completed",
                readyToCommit: row.state === "ready",
                playerIds: (row.playerIds ?? []).map(Number),
                roundCount: Number(row.roundCount),
                requiredEntrantCount: Number(row.requiredEntrantCount),
                pendingRuleCount: Number(row.pendingRuleCount),
                isCurrentEntry: entryId === currentEntryId,
            },
        };
    }

    private async conflictsOf(
        manager: EntityManager,
        tournamentId: number,
        entry: ScheduleEntrySnapshot,
        deactivated: ScheduleEntrySnapshot[],
    ): Promise<ScheduleConflicts> {
        const settled = [entry.match.matchId, ...deactivated.map((passed) => passed.match.matchId)];
        const rows: ActiveConflictRow[] = await manager.query(ACTIVE_CONFLICTS, [tournamentId, settled, entry.match.playerIds]);

        return {
            blockingMatchIds: [...new Set(rows.map((row) => Number(row.matchId)))],
            blockingPlayerIds: [...new Set(rows.map((row) => Number(row.playerId)))],
        };
    }

    private async loadScheduleForUpdate(manager: EntityManager, scheduleId: number): Promise<Schedule> {
        const schedule = await manager.findOne(Schedule, {
            where: { id: scheduleId },
            lock: { mode: "pessimistic_write" },
        });
        if (!schedule) {
            throw new NotFoundException(`Schedule ${scheduleId} not found`);
        }

        return schedule;
    }

    private async deactivateCurrent(manager: EntityManager, schedule: Schedule): Promise<MatchAddress[]> {
        if (!schedule.currentEntryId) {
            return [];
        }
        const rows: MatchAddressRow[] = await manager.query(ACTIVE_MATCH_OF_ENTRY, [schedule.currentEntryId]);
        if (rows.length === 0) {
            return [];
        }

        const address = this.addressOf(rows[0]);
        await manager.update(Match, { id: address.matchId }, { active: false });

        return [address];
    }

    private addressOf(row: MatchAddressRow): MatchAddress {
        return {
            tournamentId: Number(row.tournamentId),
            divisionId: Number(row.divisionId),
            phaseId: Number(row.phaseId),
            phaseGroupId: Number(row.phaseGroupId),
            matchId: Number(row.matchId),
        };
    }

    private async announce(transition: ScheduleTransition): Promise<void> {
        await this.publisher.emitScheduleUpdate(transition.tournamentId, transition.scheduleId);
        for (const address of transition.matchAddresses) {
            await this.publisher.emitMatchUpdate(address);
        }
    }
}
