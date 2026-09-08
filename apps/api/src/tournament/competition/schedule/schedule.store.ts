import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { Schedule, ScheduleEntry, Match, Tournament } from "@tournament-hub/persistence";

import { ScheduleAggregate } from "./schedule.aggregate";

export type ScheduleEntryInput = { matchId: number; expectedDurationMinutes: number };

const PARK_ENTRY_POSITIONS = `
    UPDATE  "schedule_entry"
    SET     "position" = "position" + 1000000
    WHERE   "scheduleId" = $1
`;

@Injectable()
export class ScheduleStore {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
        @InjectRepository(ScheduleEntry) private readonly entries: Repository<ScheduleEntry>,
        @InjectRepository(Tournament) private readonly tournaments: Repository<Tournament>,
        @InjectRepository(Match) private readonly matches: Repository<Match>,
    ) {}

    async load(id: number): Promise<ScheduleAggregate | null> {
        const schedule = await this.schedules.findOne({
            where: { id },
            relations: { tournament: true, entries: { match: true } },
            order: { entries: { position: "ASC" } },
        });

        return schedule ? ScheduleAggregate.of(schedule) : null;
    }

    async loadOrFail(id: number): Promise<ScheduleAggregate> {
        const schedule = await this.load(id);
        if (!schedule) {
            throw new NotFoundException(`Schedule ${id} not found`);
        }

        return schedule;
    }

    async loadTournament(id: number): Promise<Tournament> {
        const tournament = await this.tournaments.findOneBy({ id });
        if (!tournament) {
            throw new NotFoundException(`Tournament ${id} not found`);
        }

        return tournament;
    }

    async save(schedule: ScheduleAggregate): Promise<void> {
        await this.schedules.save(schedule.entity);
    }

    async create(tournamentId: number, name: string, willStartAt: Date, defaultExpectedDurationMinutes: number, matchIds: number[]): Promise<number> {
        return this.dataSource.transaction(async (manager) => {
            const tournament = await manager.findOneBy(Tournament, { id: tournamentId });
            if (!tournament) {
                throw new NotFoundException(`Tournament ${tournamentId} not found`);
            }
            const matches = await this.validatedMatches(manager, tournamentId, matchIds);
            const assignedCount = matchIds.length > 0
                ? await manager.count(ScheduleEntry, { where: { match: { id: In(matchIds) } } })
                : 0;
            if (assignedCount > 0) {
                throw new ConflictException("One or more matches already belong to a schedule");
            }
            const aggregate = ScheduleAggregate.create(name, willStartAt, tournament);
            await manager.save(Schedule, aggregate.entity);
            const entries = matches.map((match, position) => {
                const entry = new ScheduleEntry();
                entry.schedule = aggregate.entity;
                entry.match = match;
                entry.position = position;
                entry.expectedDurationMinutes = defaultExpectedDurationMinutes;
                entry.startedAt = null;
                entry.completedAt = null;
                return entry;
            });
            if (entries.length > 0) {
                await manager.save(ScheduleEntry, entries);
            }

            return aggregate.id;
        });
    }

    async remove(schedule: ScheduleAggregate): Promise<void> {
        schedule.assertEditable();
        await this.schedules.remove(schedule.entity);
    }

    async replaceEntries(scheduleId: number, version: number, inputs: ScheduleEntryInput[]): Promise<void> {
        const matchIds = inputs.map((input) => input.matchId);
        if (new Set(matchIds).size !== matchIds.length) {
            throw new ConflictException("A match can appear only once in a schedule");
        }

        await this.dataSource.transaction(async (manager) => {
            const schedule = await manager.findOne(Schedule, {
                where: { id: scheduleId },
                lock: { mode: "pessimistic_write" },
            });
            if (!schedule) {
                throw new NotFoundException(`Schedule ${scheduleId} not found`);
            }
            const aggregate = ScheduleAggregate.of(schedule);
            aggregate.assertEditable();
            if (schedule.version !== version) {
                throw new ConflictException("The schedule changed; reload it before saving the order");
            }

            schedule.tournament = await manager.findOneByOrFail(Tournament, { id: schedule.tournamentId });

            const matches = await this.validatedMatches(manager, schedule.tournament.id, matchIds);
            const matchById = new Map(matches.map((match) => [match.id, match]));

            const assignments =
                matchIds.length > 0
                    ? await manager.find(ScheduleEntry, {
                          where: { match: { id: In(matchIds) } },
                          relations: { schedule: true, match: true },
                      })
                    : [];
            const foreignScheduleIds = [...new Set(assignments.filter((entry) => entry.schedule.id !== scheduleId).map((entry) => entry.schedule.id))];
            if (foreignScheduleIds.length > 0) {
                const foreignSchedules = await manager.find(Schedule, { where: { id: In(foreignScheduleIds) } });
                if (foreignSchedules.some((candidate) => candidate.status !== "inactive")) {
                    throw new ConflictException("Matches can move only between inactive schedules");
                }
                await manager.delete(ScheduleEntry, { schedule: { id: In(foreignScheduleIds) }, match: { id: In(matchIds) } });
            }

            const existing = await manager.find(ScheduleEntry, { where: { schedule: { id: scheduleId } }, relations: { match: true } });
            const existingByMatchId = new Map(existing.map((entry) => [entry.match.id, entry]));
            const removed = existing.filter((entry) => !matchIds.includes(entry.match.id));
            if (removed.length > 0) {
                await manager.remove(ScheduleEntry, removed);
            }
            if (existing.length > 0) {
                await manager.query(PARK_ENTRY_POSITIONS, [scheduleId]);
            }
            const replacement = inputs.map((input, index) => {
                const entry = existingByMatchId.get(input.matchId) ?? new ScheduleEntry();
                entry.schedule = schedule;
                entry.match = matchById.get(input.matchId);
                entry.position = index;
                entry.expectedDurationMinutes = input.expectedDurationMinutes;
                entry.startedAt ??= null;
                entry.completedAt ??= null;

                return entry;
            });
            if (replacement.length > 0) {
                await manager.save(ScheduleEntry, replacement);
            }
            schedule.currentEntryId = null;
            await manager.save(Schedule, schedule);
        });
    }

    async updateExpectedDuration(scheduleId: number, entryId: number, expectedDurationMinutes: number): Promise<number> {
        return this.dataSource.transaction(async (manager) => {
            const schedule = await manager.findOneBy(Schedule, { id: scheduleId });
            if (!schedule) {
                throw new NotFoundException(`Schedule ${scheduleId} not found`);
            }
            if (schedule.status === "completed" || schedule.archivedAt) {
                throw new ConflictException(`Schedule ${scheduleId} no longer accepts timing changes`);
            }
            const entry = await manager.findOne(ScheduleEntry, { where: { id: entryId, schedule: { id: scheduleId } } });
            if (!entry) {
                throw new NotFoundException(`Schedule entry ${entryId} not found`);
            }
            entry.expectedDurationMinutes = expectedDurationMinutes;
            await manager.save(ScheduleEntry, entry);

            return schedule.tournamentId;
        });
    }

    async scheduleIdForMatch(matchId: number): Promise<number | null> {
        const entry = await this.entries.findOne({ where: { match: { id: matchId } }, relations: { schedule: true } });

        return entry?.schedule?.id ?? null;
    }

    async operationalScheduleIds(tournamentId: number): Promise<number[]> {
        const schedules = await this.schedules.find({
            where: { tournament: { id: tournamentId }, status: "running" },
            select: { id: true },
        });

        return schedules.map((schedule) => schedule.id);
    }

    private async validatedMatches(manager: DataSource["manager"], tournamentId: number, matchIds: number[]): Promise<Match[]> {
        if (new Set(matchIds).size !== matchIds.length) {
            throw new ConflictException("A match can appear only once in a schedule");
        }
        const matches = matchIds.length > 0
            ? await manager.find(Match, {
                  where: { id: In(matchIds) },
                  relations: { phaseGroup: { phase: { division: { tournament: true } } } },
              })
            : [];
        if (matches.length !== matchIds.length) {
            throw new NotFoundException("One or more matches no longer exist");
        }
        const matchById = new Map(matches.map((match) => [match.id, match]));
        for (const match of matches) {
            if (match.phaseGroup?.phase?.division?.tournament?.id !== tournamentId) {
                throw new ConflictException(`Match ${match.id} belongs to another tournament`);
            }
        }

        return matchIds.map((matchId) => matchById.get(matchId));
    }
}
