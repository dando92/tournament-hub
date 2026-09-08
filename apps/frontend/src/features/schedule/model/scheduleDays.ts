import type { ScheduleDto } from "@tournament-hub/contracts";

import { formatDayLabel } from "@/features/schedule/model/scheduleDateTime";

export type ScheduleDay = {
    key: string;
    label: string;
    schedules: ScheduleDto[];
};

export function dayKeyOf(value: string | number | Date): string {
    const date = new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
}

export function groupSchedulesByDay(schedules: ScheduleDto[]): ScheduleDay[] {
    const days = new Map<string, ScheduleDay>();

    for (const schedule of schedules) {
        const key = dayKeyOf(schedule.willStartAt);
        const day = days.get(key) ?? { key, label: formatDayLabel(schedule.willStartAt), schedules: [] };
        day.schedules.push(schedule);
        days.set(key, day);
    }

    return [...days.values()].sort((left, right) => left.key.localeCompare(right.key));
}

export function selectDay(days: ScheduleDay[], requestedKey: string | null, now = new Date()): ScheduleDay | null {
    if (days.length === 0) {
        return null;
    }

    const requested = days.find((day) => day.key === requestedKey);
    if (requested) {
        return requested;
    }

    const todayKey = dayKeyOf(now);

    return days.find((day) => day.key >= todayKey) ?? days[days.length - 1];
}
