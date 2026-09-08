import { ScheduleEntry, Tournament } from "@tournament-hub/persistence";

import { ScheduleAggregate } from "@tournament/competition/schedule/schedule.aggregate";
import { evaluateConflicts, evaluateLocalEligibility } from "@tournament/competition/schedule/schedule.eligibility";

describe("ScheduleAggregate", () => {
    function schedule() {
        const tournament = new Tournament();
        tournament.id = 3;
        const aggregate = ScheduleAggregate.create("Cabinet 1", new Date("2026-08-25T10:00:00.000Z"), tournament);
        aggregate.entity.id = 7;
        aggregate.entity.version = 1;

        const first = new ScheduleEntry();
        first.id = 11;
        first.position = 0;
        aggregate.entity.entries = [first];

        return aggregate;
    }

    it("keeps a waiting schedule running, and clears the wait when it is stopped", () => {
        const aggregate = schedule();
        aggregate.start();
        aggregate.waitAt(11, "NOT_ENOUGH_ENTRANTS", { matchId: 20, entrantCount: 1 });

        expect(aggregate.status).toBe("running");
        expect(aggregate.entity.staleCode).toBe("NOT_ENOUGH_ENTRANTS");

        aggregate.stop();
        expect(aggregate.status).toBe("inactive");
        expect(aggregate.entity.staleCode).toBeNull();
        expect(() => aggregate.stop()).toThrow(/is not running/);
    });

    it("restarts an ordinary run from the beginning while preserving an explicit start entry", () => {
        const aggregate = schedule();
        const second = new ScheduleEntry();
        second.id = 12;
        second.position = 1;
        aggregate.entity.entries.push(second);

        aggregate.start(12);
        aggregate.stop();
        aggregate.start();
        expect(aggregate.currentEntryId).toBeNull();

        aggregate.stop();
        aggregate.start(12);
        expect(aggregate.currentEntryId).toBe(12);
    });

    it("makes completed schedules terminal and archivable", () => {
        const aggregate = schedule();
        aggregate.start();
        aggregate.complete();
        aggregate.archive();

        expect(aggregate.status).toBe("completed");
        expect(aggregate.entity.archivedAt).toBeInstanceOf(Date);
        expect(() => aggregate.start()).toThrow("not editable");
        expect(() => aggregate.rename("Changed")).toThrow("not editable");
    });

    it("reopens a completed run at the interrupted match", () => {
        const aggregate = schedule();
        aggregate.start();
        aggregate.complete();
        aggregate.archive();

        aggregate.interruptCompletedRun(11, "MATCH_RESULT_REOPENED", { matchId: 20 });

        expect(aggregate.entity).toMatchObject({
            status: "inactive",
            currentEntryId: 11,
            archivedAt: null,
            interruptionCode: "MATCH_RESULT_REOPENED",
            interruptionDetails: { matchId: 20 },
        });
        expect(aggregate.entity.interruptedAt).toBeInstanceOf(Date);
    });
});

describe("schedule eligibility", () => {
    const playable = {
        matchId: 1,
        matchName: "Match 1",
        active: false,
        completed: false,
        readyToCommit: false,
        playerIds: [1, 2],
        roundCount: 1,
        requiredEntrantCount: 2,
        pendingRuleCount: 0,
        isCurrentEntry: false,
    };

    it("passes settled matches and accepts a playable match", () => {
        expect(evaluateLocalEligibility(playable)).toEqual({ kind: "eligible" });
        expect(evaluateLocalEligibility({ ...playable, readyToCommit: true })).toEqual({ kind: "passed" });
        expect(evaluateLocalEligibility({ ...playable, completed: true })).toEqual({ kind: "passed" });
    });

    it("reports the reasons an entry states about itself", () => {
        expect(evaluateLocalEligibility({ ...playable, playerIds: [] })).toMatchObject({ kind: "stale", code: "NO_ENTRANTS" });
        expect(evaluateLocalEligibility({ ...playable, playerIds: [1] })).toMatchObject({ kind: "stale", code: "NOT_ENOUGH_ENTRANTS" });
        expect(evaluateLocalEligibility({ ...playable, requiredEntrantCount: 3, pendingRuleCount: 1 })).toMatchObject({
            kind: "stale",
            code: "UNRESOLVED_ENTRANTS",
        });
        expect(evaluateLocalEligibility({ ...playable, roundCount: 0 })).toMatchObject({ kind: "stale", code: "NO_ROUNDS" });
        expect(evaluateLocalEligibility({ ...playable, active: true })).toMatchObject({ kind: "stale", code: "MATCH_ALREADY_ACTIVE" });
    });

    it("separates a shortage that will resolve from one that cannot", () => {
        expect(evaluateLocalEligibility({ ...playable, requiredEntrantCount: 4, pendingRuleCount: 2 })).toMatchObject({
            kind: "stale",
            code: "UNRESOLVED_ENTRANTS",
        });
        expect(evaluateLocalEligibility({ ...playable, requiredEntrantCount: 4, pendingRuleCount: 1 })).toMatchObject({
            kind: "stale",
            code: "UNFILLABLE_ENTRANT_SLOTS",
            details: { entrantCount: 2, requiredEntrantCount: 4, reachableEntrantCount: 3 },
        });
    });

    it("holds a playable match while another one has its players", () => {
        expect(evaluateConflicts(playable, { blockingMatchIds: [], blockingPlayerIds: [] })).toEqual({ kind: "eligible" });
        expect(evaluateConflicts(playable, { blockingMatchIds: [9], blockingPlayerIds: [2] })).toMatchObject({
            kind: "stale",
            code: "ENTRANTS_ALREADY_ACTIVE",
            details: { blockingMatchIds: [9], blockingPlayerIds: [2] },
        });
    });
});
