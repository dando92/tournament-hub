import type { ScheduleStaleCode, ScheduleStaleDetails } from "@tournament-hub/contracts";

export type ScheduleMatchSnapshot = {
    matchId: number;
    matchName: string;
    active: boolean;
    completed: boolean;
    readyToCommit: boolean;
    playerIds: number[];
    roundCount: number;
    requiredEntrantCount: number;
    pendingRuleCount: number;
    isCurrentEntry: boolean;
};

export type ScheduleConflicts = {
    blockingMatchIds: number[];
    blockingPlayerIds: number[];
};

export type ScheduleEligibility =
    { kind: "passed" } | { kind: "eligible" } | { kind: "stale"; code: ScheduleStaleCode; details: ScheduleStaleDetails };

export function evaluateLocalEligibility(match: ScheduleMatchSnapshot): ScheduleEligibility {
    if (match.completed || match.readyToCommit) {
        return { kind: "passed" };
    }

    const details = detailsOf(match);

    if (match.playerIds.length === 0) {
        return { kind: "stale", code: "NO_ENTRANTS", details };
    }
    if (match.playerIds.length === 1) {
        return { kind: "stale", code: "NOT_ENOUGH_ENTRANTS", details };
    }
    if (match.playerIds.length < match.requiredEntrantCount) {
        const reachable = match.playerIds.length + match.pendingRuleCount;
        if (reachable < match.requiredEntrantCount) {
            return { kind: "stale", code: "UNFILLABLE_ENTRANT_SLOTS", details: { ...details, reachableEntrantCount: reachable } };
        }

        return { kind: "stale", code: "UNRESOLVED_ENTRANTS", details };
    }
    if (match.roundCount === 0) {
        return { kind: "stale", code: "NO_ROUNDS", details };
    }
    if (match.active && !match.isCurrentEntry) {
        return { kind: "stale", code: "MATCH_ALREADY_ACTIVE", details };
    }

    return { kind: "eligible" };
}

export function evaluateConflicts(match: ScheduleMatchSnapshot, conflicts: ScheduleConflicts): ScheduleEligibility {
    if (conflicts.blockingMatchIds.length === 0) {
        return { kind: "eligible" };
    }

    return {
        kind: "stale",
        code: "ENTRANTS_ALREADY_ACTIVE",
        details: {
            ...detailsOf(match),
            blockingMatchIds: conflicts.blockingMatchIds,
            blockingPlayerIds: conflicts.blockingPlayerIds,
        },
    };
}

function detailsOf(match: ScheduleMatchSnapshot): ScheduleStaleDetails {
    return {
        matchId: match.matchId,
        matchName: match.matchName,
        entrantCount: match.playerIds.length,
        requiredEntrantCount: match.requiredEntrantCount,
    };
}
