import type { ScheduleDto } from "@tournament-hub/contracts";

import { buildScheduleTimeline, shortTimingStatusLabel, timingStatusLabel } from "@/features/schedule/model/scheduleTiming";
import { isScheduleBlocked } from "@/features/schedule/model/scheduleStatus";
import type { Status } from "@/shared/components/ui/status";

export type ScheduleSummary = {
    schedule: ScheduleDto;
    live: boolean;
    status: Status;
    stateLabel: string;
    detail: string;
    timing: { label: string; shortLabel: string; tone: "on-time" | "delayed" | "ahead" } | null;
};

export function summarizeSchedule(schedule: ScheduleDto, now = new Date()): ScheduleSummary {
    const current = schedule.entries.find((entry) => entry.id === schedule.currentEntryId) ?? null;
    const remaining = schedule.entries.filter((entry) => !entry.completedAt && entry.match.state !== "completed").length;
    const live = Boolean(current?.match.active) && !schedule.staleCode;
    const timeline = buildScheduleTimeline(schedule, now);

    return {
        schedule,
        live,
        status: statusOf(schedule),
        stateLabel: stateLabelOf(schedule),
        detail: detailOf(schedule, current?.match.name ?? null, remaining),
        timing: schedule.status === "completed" || schedule.archivedAt
            ? null
            : { label: timingStatusLabel(timeline), shortLabel: shortTimingStatusLabel(timeline), tone: timeline.timingStatus },
    };
}

function statusOf(schedule: ScheduleDto): Status {
    if (schedule.status === "completed") {
        return "done";
    }
    if (isScheduleBlocked(schedule)) {
        return "failed";
    }
    if (schedule.staleCode) {
        return "pending";
    }

    return schedule.status === "running" ? "running" : "idle";
}

function stateLabelOf(schedule: ScheduleDto): string {
    if (schedule.status === "completed") {
        return schedule.archivedAt ? "Archived" : "Completed";
    }
    if (isScheduleBlocked(schedule)) {
        return "Blocked";
    }
    if (schedule.staleCode) {
        return "Waiting";
    }
    return schedule.status === "running" ? "Running" : "Not started";
}

function detailOf(schedule: ScheduleDto, currentMatchName: string | null, remaining: number): string {
    const left = `${remaining} left`;
    if (schedule.status === "completed") {
        return `${schedule.entries.length} matches`;
    }
    if (schedule.status === "inactive") {
        return `${schedule.entries.length} matches`;
    }

    return currentMatchName ? `${currentMatchName} · ${left}` : left;
}
