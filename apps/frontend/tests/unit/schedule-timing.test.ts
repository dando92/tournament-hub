import test from "node:test";
import assert from "node:assert/strict";
import type { ScheduleDto } from "@tournament-hub/contracts";

import { buildScheduleTimeline, timingStatusLabel } from "../../src/features/schedule/model/scheduleTiming.ts";

function schedule(overrides: Partial<ScheduleDto> = {}): ScheduleDto {
    return {
        id: 1,
        name: "Main stage",
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
            { id: 11, position: 0, expectedDurationMinutes: 30, startedAt: "2026-08-25T10:10:00.000Z", completedAt: "2026-08-25T10:40:00.000Z", match: { id: 101 } as never },
            { id: 12, position: 1, expectedDurationMinutes: 20, startedAt: "2026-08-25T10:40:00.000Z", completedAt: null, match: { id: 102 } as never },
            { id: 13, position: 2, expectedDurationMinutes: 25, startedAt: null, completedAt: null, match: { id: 103 } as never },
        ],
        ...overrides,
    };
}

test("derives planned starts without persisting or propagating them", () => {
    const model = buildScheduleTimeline(schedule(), new Date("2026-08-25T10:45:00.000Z"));

    assert.deepEqual(model.entries.map((entry) => entry.plannedStartAt), [
        "2026-08-25T10:00:00.000Z",
        "2026-08-25T10:30:00.000Z",
        "2026-08-25T10:50:00.000Z",
    ]);
    assert.equal(model.offsetMs, 10 * 60_000);
    assert.equal(model.entries[2].estimatedStartAt, "2026-08-25T11:00:00.000Z");
    assert.equal(timingStatusLabel(model), "+10 MIN DELAY");
});

test("treats small offsets as on time and reports ahead timing", () => {
    const now = new Date("2026-08-25T10:40:00.000Z");
    const onTime = buildScheduleTimeline(schedule({ entries: schedule().entries.map((entry, index) => index === 1 ? { ...entry, startedAt: "2026-08-25T10:33:00.000Z" } : entry) }), now);
    assert.equal(onTime.timingStatus, "on-time");

    const ahead = buildScheduleTimeline(schedule({ entries: schedule().entries.map((entry, index) => index === 1 ? { ...entry, startedAt: "2026-08-25T10:20:00.000Z" } : entry) }), now);
    assert.equal(ahead.timingStatus, "ahead");
    assert.equal(timingStatusLabel(ahead), "10 MIN AHEAD");
});

test("keeps actual timeline events fixed and applies the live offset only to future starts", () => {
    const model = buildScheduleTimeline(schedule(), new Date("2026-08-25T10:45:00.000Z"));

    assert.equal(model.entries[0].displayedStartAt, "2026-08-25T10:40:00.000Z");
    assert.equal(model.entries[1].displayedStartAt, "2026-08-25T10:40:00.000Z");
    assert.equal(model.entries[2].displayedStartAt, "2026-08-25T11:00:00.000Z");
});

test("increases delay when the current match runs beyond its expected completion", () => {
    const model = buildScheduleTimeline(schedule(), new Date("2026-08-25T11:15:00.000Z"));

    assert.equal(model.offsetMs, 25 * 60_000);
    assert.equal(model.entries[1].displayedStartAt, "2026-08-25T10:40:00.000Z");
    assert.equal(model.entries[2].estimatedStartAt, "2026-08-25T11:15:00.000Z");
    assert.equal(timingStatusLabel(model), "+30 MIN DELAY");
});

test("does not move an unstarted current match time with the clock", () => {
    const entries = schedule().entries.map((entry, index) => index === 1 ? { ...entry, startedAt: null } : entry);
    const model = buildScheduleTimeline(schedule({ entries }), new Date("2026-08-25T10:45:00.000Z"));

    assert.equal(model.entries[1].displayedStartAt, "2026-08-25T10:30:00.000Z");
    assert.equal(model.entries[2].displayedStartAt, "2026-08-25T11:05:00.000Z");
});
