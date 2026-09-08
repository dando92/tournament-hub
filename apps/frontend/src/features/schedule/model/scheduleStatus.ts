import type { ScheduleDto, ScheduleStaleCode } from "@tournament-hub/contracts";

export function scheduleStatusLabel(schedule: ScheduleDto): string {
    if (schedule.status === "running" && schedule.staleCode) return "Running — Waiting";
    return schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1);
}

const staleMessages: Record<ScheduleStaleCode, (schedule: ScheduleDto) => string> = {
    NO_ENTRANTS: (schedule) => `${schedule.staleDetails?.matchName ?? "The current match"} has no players.`,
    NOT_ENOUGH_ENTRANTS: (schedule) => `${schedule.staleDetails?.matchName ?? "The current match"} has only one player.`,
    UNRESOLVED_ENTRANTS: (schedule) => `${schedule.staleDetails?.matchName ?? "The current match"} is waiting for more entrants.`,
    UNFILLABLE_ENTRANT_SLOTS: (schedule) =>
        `${schedule.staleDetails?.matchName ?? "The current match"} expects ${schedule.staleDetails?.requiredEntrantCount ?? "more"} players`
        + ` and can reach ${schedule.staleDetails?.reachableEntrantCount ?? "fewer"}: the advancement rules that send players here leave a seat`
        + ` nothing will fill. Renumber those rules, or add the missing player by hand.`,
    NO_ROUNDS: (schedule) => `${schedule.staleDetails?.matchName ?? "The current match"} has no rounds configured.`,
    MATCH_ALREADY_ACTIVE: (schedule) => `${schedule.staleDetails?.matchName ?? "The current match"} was activated outside this schedule.`,
    ENTRANTS_ALREADY_ACTIVE: () => "One or more players are still active in another match.",
    MATCH_REMOVED: () => "The current match no longer exists.",
    MATCH_OUTSIDE_TOURNAMENT: () => "The current match no longer belongs to this tournament.",
    CURRENT_MATCH_CHANGED_EXTERNALLY: () => "The current match changed outside the schedule.",
};

export function scheduleStaleMessage(schedule: ScheduleDto): string | null {
    return schedule.staleCode ? staleMessages[schedule.staleCode](schedule) : null;
}

export function isScheduleBlocked(schedule: ScheduleDto): boolean {
    return schedule.staleCode === "UNFILLABLE_ENTRANT_SLOTS";
}

export function scheduleInterruptionMessage(schedule: ScheduleDto): string | null {
    if (schedule.interruptionCode === "MATCH_RESULT_REOPENED") {
        const matchId = Number(schedule.interruptionDetails?.matchId);
        const matchName = schedule.entries.find((entry) => entry.match.id === matchId)?.match.name ?? "The interrupted match";
        return `${matchName} was reopened. Its existing standings may still make it ready to commit; change them before restarting if the match must be replayed.`;
    }
    if (schedule.interruptionCode === "ROLLBACK_CONFIRMED") {
        return "The schedule was stopped to apply a confirmed rollback.";
    }
    if (schedule.interruptionCode === "TOURNAMENT_CLOSED") {
        return "The schedule was stopped because the tournament was closed.";
    }

    return null;
}
