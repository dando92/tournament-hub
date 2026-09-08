import type { ScheduleDto } from "@tournament-hub/contracts";

const ON_TIME_THRESHOLD_MS = 5 * 60_000;

export type ScheduleTimelineEntry = ScheduleDto["entries"][number] & {
    plannedStartAt: string;
    estimatedStartAt: string;
    displayedStartAt: string;
};

export type ScheduleTimelineModel = {
    entries: ScheduleTimelineEntry[];
    offsetMs: number;
    roundedOffsetMinutes: number;
    timingStatus: "on-time" | "delayed" | "ahead";
};

export function buildScheduleTimeline(schedule: ScheduleDto, now = new Date()): ScheduleTimelineModel {
    let plannedCursor = new Date(schedule.willStartAt).getTime();
    const plannedStarts = schedule.entries.map((entry) => {
        const start = plannedCursor;
        plannedCursor += entry.expectedDurationMinutes * 60_000;
        return start;
    });
    const currentIndex = schedule.entries.findIndex((entry) => entry.id === schedule.currentEntryId);
    const latestCompletedIndex = findLatestCompletedIndex(schedule);
    let offsetMs = 0;

    const currentEntry = currentIndex >= 0 ? schedule.entries[currentIndex] : null;
    if (currentEntry) {
        const durationMs = currentEntry.expectedDurationMinutes * 60_000;
        const plannedCompletion = plannedStarts[currentIndex] + durationMs;
        const expectedCompletion = currentEntry.startedAt
            ? new Date(currentEntry.startedAt).getTime() + durationMs
            : now.getTime() + durationMs;
        const projectedCompletion = schedule.status === "running"
            ? Math.max(expectedCompletion, now.getTime())
            : expectedCompletion;
        offsetMs = projectedCompletion - plannedCompletion;
    } else if (latestCompletedIndex >= 0) {
        const entry = schedule.entries[latestCompletedIndex];
        if (entry.completedAt) {
            const plannedCompletion = plannedStarts[latestCompletedIndex] + entry.expectedDurationMinutes * 60_000;
            offsetMs = new Date(entry.completedAt).getTime() - plannedCompletion;
        }
    }

    const estimateFromIndex = currentIndex >= 0 ? currentIndex + 1 : latestCompletedIndex + 1;
    const entries = schedule.entries.map((entry, index) => {
        const plannedStartAt = new Date(plannedStarts[index]).toISOString();
        const estimatedStartAt = new Date(plannedStarts[index] + (index >= estimateFromIndex ? offsetMs : 0)).toISOString();
        const displayedStartAt = index === currentIndex
            ? entry.startedAt ?? plannedStartAt
            : entry.completedAt ?? entry.startedAt ?? estimatedStartAt;
        return {
            ...entry,
            plannedStartAt,
            estimatedStartAt,
            displayedStartAt,
        };
    });
    const timingStatus = Math.abs(offsetMs) < ON_TIME_THRESHOLD_MS ? "on-time" : offsetMs > 0 ? "delayed" : "ahead";
    const roundedOffsetMinutes = timingStatus === "on-time" ? 0 : Math.max(10, Math.round(Math.abs(offsetMs) / 600_000) * 10);

    return { entries, offsetMs, roundedOffsetMinutes, timingStatus };
}

function findLatestCompletedIndex(schedule: ScheduleDto): number {
    for (let index = schedule.entries.length - 1; index >= 0; index -= 1) {
        if (schedule.entries[index].completedAt) return index;
    }
    return -1;
}

export function timingStatusLabel(model: ScheduleTimelineModel): string {
    if (model.timingStatus === "on-time") return "ON TIME";
    if (model.timingStatus === "delayed") return `+${model.roundedOffsetMinutes} MIN DELAY`;
    return `${model.roundedOffsetMinutes} MIN AHEAD`;
}

export function shortTimingStatusLabel(model: ScheduleTimelineModel): string {
    if (model.timingStatus === "on-time") {
        return "ON TIME";
    }

    return `${model.timingStatus === "delayed" ? "+" : "−"}${model.roundedOffsetMinutes}′`;
}
