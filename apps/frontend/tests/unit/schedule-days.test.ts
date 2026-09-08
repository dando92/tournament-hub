import test from "node:test";
import assert from "node:assert/strict";
import type { ScheduleDto } from "@tournament-hub/contracts";

import { dayKeyOf, groupSchedulesByDay, selectDay } from "../../src/features/schedule/model/scheduleDays.ts";

function schedule(id: number, name: string, willStartAt: Date): ScheduleDto {
    return {
        id,
        name,
        willStartAt: willStartAt.toISOString(),
        status: "inactive",
        currentEntryId: null,
        staleCode: null,
        staleDetails: null,
        interruptionCode: null,
        interruptionDetails: null,
        interruptedAt: null,
        archivedAt: null,
        version: 1,
        entries: [],
    };
}

const saturdayMorning = new Date(2026, 8, 5, 10, 0);
const saturdayNight = new Date(2026, 8, 5, 22, 0);
const sundayMorning = new Date(2026, 8, 6, 10, 0);

const days = groupSchedulesByDay([
    schedule(3, "Cabinet C", sundayMorning),
    schedule(1, "Cabinet A", saturdayMorning),
    schedule(2, "Late show", saturdayNight),
]);

test("a day is the schedules that open on it, whatever hour they open at", () => {
    assert.deepEqual(days.map((day) => day.key), ["2026-09-05", "2026-09-06"]);
    assert.deepEqual(days[0].schedules.map((entry) => entry.name), ["Cabinet A", "Late show"]);
    assert.deepEqual(days[1].schedules.map((entry) => entry.name), ["Cabinet C"]);
});

test("the day that was asked for wins while it exists", () => {
    assert.equal(selectDay(days, "2026-09-06", saturdayMorning)?.key, "2026-09-06");
});

test("a day that is gone falls back to today", () => {
    assert.equal(selectDay(days, "2026-09-04", saturdayNight)?.key, "2026-09-05");
});

test("a tournament that has not started opens on its first day, a finished one on its last", () => {
    assert.equal(selectDay(days, null, new Date(2026, 8, 1))?.key, "2026-09-05");
    assert.equal(selectDay(days, null, new Date(2026, 8, 20))?.key, "2026-09-06");
});

test("there is no day to choose when there is no schedule", () => {
    assert.equal(selectDay([], null, saturdayMorning), null);
    assert.equal(dayKeyOf(saturdayNight), "2026-09-05");
});
