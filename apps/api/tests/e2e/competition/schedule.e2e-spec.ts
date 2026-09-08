import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as request from "supertest";
import { DataSource, Repository } from "typeorm";

import { AppModule } from "../../../src/app.module";
import { Account } from "@tournament-hub/persistence";
import { LIVE_EVENT_PUBLISHER } from "@tournament-hub/live-messaging";
import { dropTestDatabase, getTestDatabaseName, resetMigratedTestDatabase } from "../../support/postgres-test-database";

const database = getTestDatabaseName("schedule");
process.env.DATABASE_NAME = database;

type MatchBody = {
    id: number;
    active: boolean;
    matchResult: unknown | null;
    rounds: Array<{ id: number }>;
    entrants: Array<{ participants: Array<{ player: { id: number } }> }>;
};

describe("Control Room (e2e)", () => {
    let app: INestApplication;
    let accessToken: string;
    let tournamentId: number;
    let divisionId: number;
    let phaseId: number;
    let poolId: number;
    let songId: number;
    const entrants: number[] = [];

    beforeAll(async () => {
        const migrations = await resetMigratedTestDatabase(database);
        await migrations.destroy();

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(LIVE_EVENT_PUBLISHER)
            .useValue({ publish: () => Promise.resolve() })
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();

        const accounts = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
        const credentials = {
            username: "schedule-owner",
            email: "schedule@example.test",
            password: "ControlRoomPassword!",
            playerName: "Control Room Owner",
        };
        await request(app.getHttpServer()).post("/user").send(credentials).expect(201);
        const account = await accounts.findOneByOrFail({ username: credentials.username });
        account.isTournamentCreator = true;
        await accounts.save(account);
        const login = await request(app.getHttpServer())
            .post("/auth/login")
            .send({ username: credentials.username, password: credentials.password })
            .expect(201);
        accessToken = login.body.access_token;

        const tournament = await request(app.getHttpServer())
            .post("/tournaments")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ name: "Control Room Tournament" })
            .expect(201);
        tournamentId = tournament.body.id;
        const division = await request(app.getHttpServer()).post("/divisions").send({ name: "Main", tournamentId }).expect(201);
        divisionId = division.body.id;
        for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
            entrants.push(await addEntrant(name));
        }
        const phase = await request(app.getHttpServer()).post("/phases").send({ name: "Phase", divisionId }).expect(201);
        phaseId = phase.body.id;
        const pool = await request(app.getHttpServer()).post(`/phases/${phase.body.id}/phase-groups`).send({ name: "Pool" }).expect(201);
        poolId = pool.body.id;
        const song = await request(app.getHttpServer())
            .post("/songs")
            .send({
                title: "Control Song",
                artist: "Test",
                group: "Test",
                difficulty: 9,
                tournamentId,
            })
            .expect(201);
        songId = song.body.id;
    });

    afterAll(async () => {
        await app.close();
        await dropTestDatabase(database);
    });

    async function addEntrant(playerName: string): Promise<number> {
        const participant = await request(app.getHttpServer())
            .post(`/tournaments/${tournamentId}/participants`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ playerName })
            .expect(201);
        const admitted = await request(app.getHttpServer())
            .post(`/divisions/${divisionId}/participants`)
            .send({ participantIds: [participant.body.id] })
            .expect(201);

        return admitted.body[0].id;
    }

    async function createMatch(name: string, entrantIds: number[], phaseGroupId = poolId): Promise<MatchBody> {
        const created = await request(app.getHttpServer())
            .post("/matches")
            .send({
                name,
                phaseGroupId,
                scoringSystem: "PlacementPointsWithFailZero",
                entrantIds,
                songIds: [songId],
            })
            .expect(201);

        return readMatch(created.body.id);
    }

    async function readMatch(matchId: number): Promise<MatchBody> {
        return (await request(app.getHttpServer()).get(`/matches/${matchId}`).expect(200)).body;
    }

    async function createSchedule(name: string, matchIds: number[]): Promise<number> {
        const created = await request(app.getHttpServer())
            .post(`/tournaments/${tournamentId}/schedules`)
            .send({
                name,
                willStartAt: "2026-08-25T18:00:00.000Z",
                defaultExpectedDurationMinutes: 30,
                matchIds,
            })
            .expect(201);

        return created.body.id;
    }

    async function boardRows(scheduleId: number): Promise<Array<{ id: number; active: boolean }>> {
        const boards = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules`).expect(200);
        const board = boards.body.find((schedule: { id: number }) => schedule.id === scheduleId);

        return board.entries.map((entry: { match: MatchBody }) => ({ id: entry.match.id, active: entry.match.active }));
    }

    async function score(match: MatchBody): Promise<void> {
        const current = await readMatch(match.id);
        const playerIds = current.entrants.map((entrant) => entrant.participants[0].player.id);
        for (const [index, playerId] of playerIds.entries()) {
            await request(app.getHttpServer())
                .put(`/rounds/${current.rounds[0].id}/scores/${playerId}`)
                .send({ percentage: 99 - index, isFailed: false })
                .expect(204);
        }
    }

    it("offers the matches no schedule of the tournament holds, to the creation form and to the editor", async () => {
        const assigned = await createMatch("Assigned to a schedule", entrants.slice(0, 2));
        const free = await createMatch("Left unassigned", entrants.slice(0, 2));
        const scheduleId = await createSchedule("Cabinet with one match", [assigned.id]);

        const creation = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules/creation`).expect(200);
        const offeredIds = creation.body.unassignedMatches.map((match: MatchBody) => match.id);
        expect(offeredIds).toContain(free.id);
        expect(offeredIds).not.toContain(assigned.id);

        const editor = await request(app.getHttpServer()).get(`/schedules/${scheduleId}/editor`).expect(200);
        expect(editor.body.unassignedMatches.map((match: MatchBody) => match.id)).toEqual(offeredIds);
        expect(editor.body.schedule.entries.map((entry: { match: MatchBody }) => entry.match.id)).toEqual([assigned.id]);
    });

    it("advances without committing and blocks manual activation", async () => {
        const first = await createMatch("First", entrants.slice(0, 2));
        const second = await createMatch("Second", entrants.slice(0, 2));
        const scheduleId = await createSchedule("Cabinet 1", [first.id, second.id]);

        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);
        expect((await readMatch(first.id)).active).toBe(true);
        const startedSchedule = await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200);
        expect(startedSchedule.body).toMatchObject({
            willStartAt: "2026-08-25T18:00:00.000Z",
            entries: [
                { expectedDurationMinutes: 30, completedAt: null },
                { expectedDurationMinutes: 30, startedAt: null, completedAt: null },
            ],
        });
        expect(startedSchedule.body.entries[0].startedAt).not.toBeNull();
        await request(app.getHttpServer()).put(`/matches/${second.id}/active`).send({ active: true }).expect(409);

        await score(first);
        const schedule = await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200);
        expect(schedule.body.status).toBe("running");
        expect(schedule.body.currentEntryId).toBe(schedule.body.entries[1].id);
        expect(schedule.body.entries[0].completedAt).not.toBeNull();
        expect(schedule.body.entries[1].startedAt).not.toBeNull();
        expect(await readMatch(first.id)).toMatchObject({ active: false, matchResult: null });
        expect((await readMatch(second.id)).active).toBe(true);
    });

    it("keeps a stale schedule running until an entrant resolves it", async () => {
        const waiting = await createMatch("Waiting", [entrants[2]]);
        const scheduleId = await createSchedule("Cabinet 2", [waiting.id]);
        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);

        let schedule = await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200);
        expect(schedule.body).toMatchObject({ status: "running", staleCode: "NOT_ENOUGH_ENTRANTS" });
        expect((await readMatch(waiting.id)).active).toBe(false);

        await request(app.getHttpServer())
            .patch(`/matches/${waiting.id}`)
            .send({ entrantIds: [entrants[2], entrants[3]] })
            .expect(204);
        schedule = await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200);
        expect(schedule.body).toMatchObject({ status: "running", staleCode: null });
        expect((await readMatch(waiting.id)).active).toBe(true);

        await score(waiting);
        schedule = await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200);
        expect(schedule.body.status).toBe("completed");
        expect(await readMatch(waiting.id)).toMatchObject({ active: false, matchResult: null });

        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/archive`).expect(204);
        expect((await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200)).body.archivedAt).not.toBeNull();
        await request(app.getHttpServer()).delete(`/schedules/${scheduleId}/archive`).expect(204);
    });

    it("tells a shortage the tournament will resolve from one the rules never can", async () => {
        const seated = [await addEntrant("Golf"), await addEntrant("Hotel"), await addEntrant("India")];
        const pendingFeeder = await createMatch("Feeder still to play", entrants.slice(0, 2));
        const waiting = await createMatch("Waiting for a seat", seated);
        await request(app.getHttpServer())
            .put(`/advancement-rules/sources/match/${pendingFeeder.id}`)
            .send({ rules: [{ sourcePlacement: 1, targetKind: "match", targetId: waiting.id, targetSlot: 4 }] })
            .expect(204);

        const waitingScheduleId = await createSchedule("Cabinet waiting on a feeder", [waiting.id]);
        await request(app.getHttpServer()).post(`/schedules/${waitingScheduleId}/start`).expect(204);
        expect((await request(app.getHttpServer()).get(`/schedules/${waitingScheduleId}`).expect(200)).body).toMatchObject({
            status: "running",
            staleCode: "UNRESOLVED_ENTRANTS",
            staleDetails: { entrantCount: 3, requiredEntrantCount: 4 },
        });

        const settledFeeder = await createMatch("Feeder already played", [
            await addEntrant("Juliett"),
            await addEntrant("Kilo"),
            await addEntrant("Lima"),
            await addEntrant("Mike"),
        ]);
        const gapped = await createMatch("Target with an unfilled slot", []);
        await request(app.getHttpServer())
            .put(`/advancement-rules/sources/match/${settledFeeder.id}`)
            .send({
                rules: [
                    { sourcePlacement: 1, targetKind: "match", targetId: gapped.id, targetSlot: 1 },
                    { sourcePlacement: 3, targetKind: "match", targetId: gapped.id, targetSlot: 3 },
                    { sourcePlacement: 4, targetKind: "match", targetId: gapped.id, targetSlot: 4 },
                ],
            })
            .expect(204);
        await score(settledFeeder);
        await request(app.getHttpServer()).put(`/matches/${settledFeeder.id}/result`).expect(200);
        expect((await readMatch(gapped.id)).entrants).toHaveLength(3);

        const gappedScheduleId = await createSchedule("Cabinet that cannot proceed", [gapped.id]);
        await request(app.getHttpServer()).post(`/schedules/${gappedScheduleId}/start`).expect(204);
        expect((await request(app.getHttpServer()).get(`/schedules/${gappedScheduleId}`).expect(200)).body).toMatchObject({
            status: "running",
            staleCode: "UNFILLABLE_ENTRANT_SLOTS",
            staleDetails: { matchId: gapped.id, entrantCount: 3, requiredEntrantCount: 4, reachableEntrantCount: 3 },
        });
        expect((await readMatch(gapped.id)).active).toBe(false);
    });

    it("requires confirmation before a rollback stops a running schedule", async () => {
        const match = await createMatch("Rollback", entrants.slice(2, 4));
        const scheduleId = await createSchedule("Rollback schedule", [match.id]);
        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);

        await request(app.getHttpServer()).delete(`/rounds/${match.rounds[0].id}`).expect(409);
        await request(app.getHttpServer()).delete(`/rounds/${match.rounds[0].id}`).set("x-confirm-schedule-stop", "true").expect(204);
        expect((await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200)).body.status).toBe("inactive");
        expect((await readMatch(match.id)).active).toBe(false);
    });

    it("reopens a completed schedule at a match after confirmation", async () => {
        const match = await createMatch("Completed reopen", entrants.slice(2, 4));
        const scheduleId = await createSchedule("Completed reopen schedule", [match.id]);
        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);
        await score(match);
        await request(app.getHttpServer()).put(`/matches/${match.id}/result`).expect(200);
        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/archive`).expect(204);

        const confirmation = await request(app.getHttpServer()).delete(`/matches/${match.id}/result`).expect(409);
        expect(confirmation.body).toMatchObject({
            code: "SCHEDULE_STOP_CONFIRMATION_REQUIRED",
            scheduleId,
            matchId: match.id,
        });

        await request(app.getHttpServer()).delete(`/matches/${match.id}/result`).set("x-confirm-schedule-stop", "true").expect(204);
        const schedule = await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200);
        expect(schedule.body).toMatchObject({
            status: "inactive",
            currentEntryId: schedule.body.entries[0].id,
            archivedAt: null,
            interruptionCode: "MATCH_RESULT_REOPENED",
            interruptionDetails: { matchId: match.id },
        });
        expect(schedule.body.interruptedAt).not.toBeNull();
        expect((await readMatch(match.id)).matchResult).toBeNull();
    });

    it("refuses to reopen a result when an affected advancement target has scores", async () => {
        const source = await createMatch("Guarded source", entrants.slice(0, 2));
        const target = await createMatch("Progressed target", [entrants[2]]);
        await request(app.getHttpServer())
            .put(`/advancement-rules/sources/match/${source.id}`)
            .send({ rules: [{ sourcePlacement: 1, targetKind: "match", targetId: target.id, targetSlot: 2 }] })
            .expect(204);
        await score(source);
        await request(app.getHttpServer()).put(`/matches/${source.id}/result`).expect(200);
        await score(target);

        const blocked = await request(app.getHttpServer()).delete(`/matches/${source.id}/result`).expect(409);
        expect(blocked.body).toMatchObject({
            code: "ADVANCEMENT_ROLLBACK_BLOCKED_BY_TARGET_PROGRESS",
            sourceMatchId: source.id,
            blockingTargets: [{ kind: "match", id: target.id, reason: "SCORES_RECORDED" }],
        });
        expect((await readMatch(source.id)).matchResult).not.toBeNull();
        expect((await readMatch(target.id)).entrants).toHaveLength(2);
    });

    it("also protects progressed pools reached through advancement", async () => {
        const targetPool = await request(app.getHttpServer()).post(`/phases/${phaseId}/phase-groups`).send({ name: "Progressed destination pool" }).expect(201);
        const source = await createMatch("Pool advancing source", entrants.slice(0, 2));
        const progressed = await createMatch("Progressed pool match", entrants.slice(2, 4), targetPool.body.id);
        await request(app.getHttpServer())
            .put(`/advancement-rules/sources/match/${source.id}`)
            .send({ rules: [{ sourcePlacement: 1, targetKind: "phase_group", targetId: targetPool.body.id, targetSlot: 1 }] })
            .expect(204);
        await score(source);
        await request(app.getHttpServer()).put(`/matches/${source.id}/result`).expect(200);
        await score(progressed);

        const blocked = await request(app.getHttpServer()).delete(`/matches/${source.id}/result`).expect(409);
        expect(blocked.body).toMatchObject({
            code: "ADVANCEMENT_ROLLBACK_BLOCKED_BY_TARGET_PROGRESS",
            blockingTargets: [
                {
                    kind: "phase_group",
                    id: targetPool.body.id,
                    reason: "SCORES_RECORDED",
                    blockingMatchId: progressed.id,
                },
            ],
        });
    });

    it("recalculates the schedule only when a write can move its verdict, and loads no match graph when it does", async () => {
        const countQueriesOf = async (fragment: string, send: () => Promise<unknown>): Promise<number> => {
            const dataSource = app.get(DataSource);
            const logger = dataSource.logger;
            let matched = 0;
            (dataSource as unknown as { logger: unknown }).logger = {
                ...logger,
                logQuery: (query: string) => {
                    if (query.includes(fragment)) {
                        matched += 1;
                    }
                },
            };

            try {
                await send();
            } finally {
                (dataSource as unknown as { logger: unknown }).logger = logger;
            }

            return matched;
        };
        const RECALCULATION = 'entry."scheduleId" AS "scheduleId"';
        const MATCH_GRAPH = '"distinctAlias"."Match_id"';

        const probed = [await addEntrant("Echo"), await addEntrant("Foxtrot")];
        const first = await createMatch("Probed", probed);
        const second = await createMatch("Probed next", probed);
        const scheduleId = await createSchedule("Probed cabinet", [first.id, second.id]);
        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);

        const current = await readMatch(first.id);
        const [firstPlayerId, secondPlayerId] = current.entrants.map((entrant) => entrant.participants[0].player.id);
        const roundId = current.rounds[0].id;
        const scoreOf = (playerId: number, percentage: number) => () =>
            request(app.getHttpServer()).put(`/rounds/${roundId}/scores/${playerId}`).send({ percentage, isFailed: false }).expect(204);

        expect(await countQueriesOf(RECALCULATION, scoreOf(firstPlayerId, 99))).toBe(0);

        expect(await countQueriesOf(MATCH_GRAPH, scoreOf(secondPlayerId, 98))).toBe(1);
        expect((await readMatch(second.id)).active).toBe(true);
        expect((await readMatch(first.id)).active).toBe(false);
    });

    it("reports on the board row which match of the schedule is active", async () => {
        const players = [await addEntrant("Kilo"), await addEntrant("Lima")];
        const first = await createMatch("Boarded", players);
        const second = await createMatch("Boarded next", players);
        const scheduleId = await createSchedule("Boarded cabinet", [first.id, second.id]);

        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);
        expect(await boardRows(scheduleId)).toEqual([
            { id: first.id, active: true },
            { id: second.id, active: false },
        ]);

        await score(first);
        expect(await boardRows(scheduleId)).toEqual([
            { id: first.id, active: false },
            { id: second.id, active: true },
        ]);
    });

    it("draws a board row from a summary of the match, and never from a card of it", async () => {
        const players = [await addEntrant("Golf"), await addEntrant("Hotel")];
        const played = await createMatch("Summarised", players);
        await createSchedule("Summarised cabinet", [played.id]);
        const current = await readMatch(played.id);
        const [firstPlayerId] = current.entrants.map((entrant) => entrant.participants[0].player.id);
        await request(app.getHttpServer())
            .put(`/rounds/${current.rounds[0].id}/scores/${firstPlayerId}`)
            .send({ percentage: 97, isFailed: false })
            .expect(204);

        const boards = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules`).expect(200);
        const row = boards.body
            .flatMap((schedule: { entries: Array<{ match: Record<string, unknown> }> }) => schedule.entries)
            .map((entry: { match: Record<string, unknown> }) => entry.match)
            .find((match: { id: number }) => match.id === played.id);

        expect(row).toMatchObject({
            id: played.id,
            name: "Summarised",
            state: "partial",
            songCount: 1,
            handScored: false,
            missingScoreCount: 1,
            tiebreakInProgress: false,
            winner: null,
        });
        expect(row.entrants).toHaveLength(2);
        expect(row.entrants[0]).toMatchObject({ type: "player", player: { id: expect.any(Number), playerName: expect.any(String) } });

        for (const field of ["rounds", "standings", "tiebreaks", "resultState", "matchResult", "notes", "scoringSystem"]) {
            expect(row).not.toHaveProperty(field);
        }
    });

    it("keeps the archived boards out of the live list, and offers them through counts instead", async () => {
        const players = [await addEntrant("India"), await addEntrant("Juliett")];
        const match = await createMatch("Archivable", players);
        const scheduleId = await createSchedule("Archivable cabinet", [match.id]);
        const before = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules/activity`).expect(200);

        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);
        expect((await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules/activity`).expect(200)).body.running).toBe(true);

        await score(match);
        await request(app.getHttpServer()).put(`/matches/${match.id}/result`).expect(200);
        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/archive`).expect(204);

        const live = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules`).expect(200);
        expect(live.body.map((schedule: { id: number }) => schedule.id)).not.toContain(scheduleId);

        const archived = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules?archived=true`).expect(200);
        expect(archived.body.map((schedule: { id: number }) => schedule.id)).toEqual([scheduleId]);
        expect(archived.body[0].entries[0].match).toMatchObject({ id: match.id, state: "completed", winner: { playerName: expect.any(String) } });

        const after = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules/activity`).expect(200);
        expect(after.body.archivedCount).toBe(before.body.archivedCount + 1);
    });
    it("takes its matches back when it starts, and leaves none active when it stops", async () => {
        const live = await request(app.getHttpServer()).get(`/tournaments/${tournamentId}/schedules`).expect(200);
        for (const running of live.body.filter((schedule: { status: string }) => schedule.status === "running")) {
            await request(app.getHttpServer()).post(`/schedules/${running.id}/stop`).expect(204);
        }

        const players = [await addEntrant("Mike"), await addEntrant("November")];
        const first = await createMatch("Taken back", players);
        const second = await createMatch("Taken back next", players);
        const scheduleId = await createSchedule("Taken back schedule", [first.id, second.id]);

        await request(app.getHttpServer()).put(`/matches/${second.id}/active`).send({ active: true }).expect(204);
        expect((await readMatch(second.id)).active).toBe(true);

        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/start`).expect(204);
        expect((await request(app.getHttpServer()).get(`/schedules/${scheduleId}`).expect(200)).body.staleCode).toBeNull();
        expect(await boardRows(scheduleId)).toEqual([
            { id: first.id, active: true },
            { id: second.id, active: false },
        ]);

        await request(app.getHttpServer()).post(`/schedules/${scheduleId}/stop`).expect(204);
        expect(await boardRows(scheduleId)).toEqual([
            { id: first.id, active: false },
            { id: second.id, active: false },
        ]);
    });
});
