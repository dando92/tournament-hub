import test from "node:test";
import assert from "node:assert/strict";
import type { MatchSummaryDto, ScheduleDto } from "@tournament-hub/contracts";

import { blockDensity, buildScheduleBoard, previewLineup, sourceLabel } from "../../src/features/schedule/model/scheduleBoard.ts";

const PIXELS_PER_MINUTE = 3;
const NOW = new Date("2026-08-25T10:50:00.000Z");

function match(overrides: Partial<MatchSummaryDto> = {}): MatchSummaryDto {
    return {
        id: 101,
        name: "Winners R1",
        subtitle: "",
        active: false,
        state: "open",
        phaseGroupId: 7,
        entrants: [],
        incomingRules: [],
        songCount: 0,
        handScored: false,
        missingScoreCount: 0,
        tiebreakInProgress: false,
        winner: null,
        ...overrides,
    } as MatchSummaryDto;
}

function schedule(overrides: Partial<ScheduleDto> = {}): ScheduleDto {
    return {
        id: 1,
        name: "Cabinet A",
        willStartAt: "2026-08-25T10:00:00.000Z",
        status: "running",
        currentEntryId: 12,
        staleCode: null,
        staleDetails: null,
        interruptionCode: null,
        interruptionDetails: null,
        interruptedAt: null,
        archivedAt: null,
        version: 1,
        entries: [
            {
                id: 11,
                position: 0,
                expectedDurationMinutes: 30,
                startedAt: "2026-08-25T10:00:00.000Z",
                completedAt: "2026-08-25T10:25:00.000Z",
                match: match({ id: 101, state: "completed", winner: { id: 5, playerName: "ALESSIO" } }),
            },
            {
                id: 12,
                position: 1,
                expectedDurationMinutes: 20,
                startedAt: "2026-08-25T10:25:00.000Z",
                completedAt: null,
                match: match({ id: 102, name: "Winners R2", active: true }),
            },
            { id: 13, position: 2, expectedDurationMinutes: 40, startedAt: null, completedAt: null, match: match({ id: 103, name: "Losers R2" }) },
        ],
        ...overrides,
    };
}

function board(input = schedule()) {
    return buildScheduleBoard([input], PIXELS_PER_MINUTE, NOW);
}

test("a settled entry occupies the time it actually took, not the time it was given", () => {
    const [block] = board().columns[0].blocks;

    assert.equal(block.state, "completed");
    assert.equal(block.height, 25 * PIXELS_PER_MINUTE);
});

test("the entry being played keeps growing once it passes its expected end", () => {
    const block = board().columns[0].blocks[1];

    assert.equal(block.state, "playing");
    assert.equal(block.endMs, NOW.getTime());
    assert.equal(block.height, 25 * PIXELS_PER_MINUTE);
});

test("a schedule waiting on somebody says so on its current entry alone", () => {
    const waiting = board(schedule({ staleCode: "UNRESOLVED_ENTRANTS" })).columns[0].blocks;

    assert.deepEqual(waiting.map((block) => block.state), ["completed", "waiting", "upcoming"]);
});

test("the axis starts on a half hour and carries the present", () => {
    const model = board();

    assert.equal(new Date(model.ticks[0].atMs).toISOString(), "2026-08-25T10:00:00.000Z");
    assert.equal(new Date(model.ticks[1].atMs).toISOString(), "2026-08-25T10:30:00.000Z");
    assert.equal(model.nowTop, 50 * PIXELS_PER_MINUTE);
});

test("a block never shrinks below a touch target, however short the match", () => {
    const brief = schedule({
        currentEntryId: null,
        status: "inactive",
        entries: [{ id: 21, position: 0, expectedDurationMinutes: 5, startedAt: null, completedAt: null, match: match({ id: 201 }) }],
    });

    const [block] = board(brief).columns[0].blocks;
    assert.equal(block.height, 44);
    assert.equal(blockDensity(block.height, true), "minimal");
});

test("a finished match collapses to its winner and an open one lists who is in it", () => {
    const played = match({
        entrants: [
            { id: 1, name: "ALESSIO", type: "player", player: { id: 5, playerName: "ALESSIO" } },
            { id: 2, name: "MARTA", type: "player", player: { id: 6, playerName: "MARTA" } },
        ],
        state: "completed",
        winner: { id: 5, playerName: "ALESSIO" },
    });

    assert.equal(previewLineup(played).winnerName, "ALESSIO");
    assert.deepEqual(previewLineup(played).playerNames, ["ALESSIO", "MARTA"]);
});

test("the slots a match is still waiting for are named by the rule that feeds them", () => {
    const pending = match({
        id: 300,
        entrants: [
            { id: 1, name: "ALESSIO", type: "player", player: { id: 5, playerName: "ALESSIO" } },
        ],
        incomingRules: [
            { id: 1, sourceKind: "match", sourceId: 101, sourceName: "Winners R1", sourcePlacement: 1, targetKind: "match", targetId: 300, targetName: "Grand final", targetSlot: 1 },
            { id: 2, sourceKind: "phase_group", sourceId: 9, sourceName: "Pool C", sourcePlacement: 2, targetKind: "match", targetId: 300, targetName: "Grand final", targetSlot: 2 },
        ],
    });

    assert.deepEqual(previewLineup(pending).pendingSources, ["2nd from Pool C"]);
});

test("a rule whose source no longer exists is still named, by what it points at", () => {
    const orphan = { id: 3, sourceKind: "match" as const, sourceId: 42, sourceName: null, sourcePlacement: 1, targetKind: "match" as const, targetId: 300, targetName: null, targetSlot: 1 };

    assert.equal(sourceLabel(orphan), "1st from Match 42");
});

test("the axis stops where the blocks do, and carries the present only when it falls inside", () => {
    const yesterday = schedule({
        status: "completed",
        currentEntryId: null,
        willStartAt: "2026-08-24T10:00:00.000Z",
        entries: [
            {
                id: 31,
                position: 0,
                expectedDurationMinutes: 30,
                startedAt: "2026-08-24T10:00:00.000Z",
                completedAt: "2026-08-24T10:30:00.000Z",
                match: match({ id: 301, state: "completed" }),
            },
        ],
    });

    const model = board(yesterday);

    assert.equal(model.height, 45 * PIXELS_PER_MINUTE);
    assert.equal(model.nowTop, null);
});

test("the scale grows until the shortest match on the board holds its lineup", () => {
    const quarters = schedule({
        currentEntryId: null,
        status: "completed",
        entries: [
            { id: 41, position: 0, expectedDurationMinutes: 15, startedAt: "2026-08-25T10:00:00.000Z", completedAt: "2026-08-25T10:12:00.000Z", match: match({ id: 401, state: "completed" }) },
            { id: 42, position: 1, expectedDurationMinutes: 15, startedAt: "2026-08-25T10:12:00.000Z", completedAt: "2026-08-25T10:30:00.000Z", match: match({ id: 402, state: "completed" }) },
        ],
    });

    const model = board(quarters);

    assert.equal(model.pixelsPerMinute, 72 / 12);
    assert.deepEqual(model.columns[0].blocks.map((block) => block.height), [72, 108]);
    assert.equal(blockDensity(model.columns[0].blocks[0].height, false), "lineup");
});

test("two blocks of one schedule never overlap, whatever the floor did to them", () => {
    const sprint = schedule({
        currentEntryId: null,
        status: "completed",
        entries: [
            { id: 51, position: 0, expectedDurationMinutes: 10, startedAt: "2026-08-25T10:00:00.000Z", completedAt: "2026-08-25T10:04:00.000Z", match: match({ id: 501, state: "completed" }) },
            { id: 52, position: 1, expectedDurationMinutes: 10, startedAt: "2026-08-25T10:04:00.000Z", completedAt: "2026-08-25T10:08:00.000Z", match: match({ id: 502, state: "completed" }) },
        ],
    });

    const [first, second] = board(sprint).columns[0].blocks;

    assert.equal(first.height, 44);
    assert.equal(second.top, first.top + first.height);
});

test("a stretch nobody plays in is drawn as a break, not as an hour of nothing", () => {
    const evening = schedule({
        currentEntryId: null,
        status: "completed",
        entries: [
            { id: 61, position: 0, expectedDurationMinutes: 30, startedAt: "2026-08-25T10:00:00.000Z", completedAt: "2026-08-25T10:30:00.000Z", match: match({ id: 601, state: "completed" }) },
            { id: 62, position: 1, expectedDurationMinutes: 30, startedAt: "2026-08-25T14:00:00.000Z", completedAt: "2026-08-25T14:30:00.000Z", match: match({ id: 602, state: "completed" }) },
        ],
    });

    const model = board(evening);
    const [gap] = model.gaps;

    assert.equal(model.pixelsPerMinute, PIXELS_PER_MINUTE);
    assert.equal(gap.top, 30 * PIXELS_PER_MINUTE);
    assert.equal(gap.height, 44);
    assert.equal(model.columns[0].blocks[1].top, 30 * PIXELS_PER_MINUTE + 44);
    assert.deepEqual(
        model.ticks.map((tick) => new Date(tick.atMs).toISOString()),
        ["2026-08-25T10:00:00.000Z", "2026-08-25T10:30:00.000Z", "2026-08-25T14:00:00.000Z", "2026-08-25T14:30:00.000Z"],
    );
});

test("a block says more only where the column being read gives it the room", () => {
    assert.equal(blockDensity(120, true), "detailed");
    assert.equal(blockDensity(120, false), "lineup");
    assert.equal(blockDensity(80, true), "lineup");
});
