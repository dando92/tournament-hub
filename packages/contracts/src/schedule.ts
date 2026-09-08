import type { MatchSummaryDto } from "./match";

export type ScheduleStatus = "inactive" | "running" | "completed";

export type ScheduleInterruptionCode = "MATCH_RESULT_REOPENED" | "ROLLBACK_CONFIRMED" | "TOURNAMENT_CLOSED";

export type ScheduleStaleCode =
    | "NO_ENTRANTS"
    | "NOT_ENOUGH_ENTRANTS"
    | "UNRESOLVED_ENTRANTS"
    | "UNFILLABLE_ENTRANT_SLOTS"
    | "NO_ROUNDS"
    | "MATCH_ALREADY_ACTIVE"
    | "ENTRANTS_ALREADY_ACTIVE"
    | "MATCH_REMOVED"
    | "MATCH_OUTSIDE_TOURNAMENT"
    | "CURRENT_MATCH_CHANGED_EXTERNALLY";

export type ScheduleStaleDetails = {
    matchId?: number;
    matchName?: string;
    entrantCount?: number;
    requiredEntrantCount?: number;
    reachableEntrantCount?: number;
    blockingMatchIds?: number[];
    blockingPlayerIds?: number[];
};

export type ScheduleEntryDto = {
    id: number;
    position: number;
    expectedDurationMinutes: number;
    startedAt: string | null;
    completedAt: string | null;
    match: MatchSummaryDto;
};

export type ScheduleDto = {
    id: number;
    name: string;
    willStartAt: string;
    status: ScheduleStatus;
    currentEntryId: number | null;
    staleCode: ScheduleStaleCode | null;
    staleDetails: ScheduleStaleDetails | null;
    interruptionCode: ScheduleInterruptionCode | null;
    interruptionDetails: Record<string, unknown> | null;
    interruptedAt: string | null;
    archivedAt: string | null;
    version: number;
    entries: ScheduleEntryDto[];
};

export type ScheduleCreationDto = {
    unassignedMatches: MatchSummaryDto[];
};

export type ScheduleEntryInputDto = {
    matchId: number;
    expectedDurationMinutes: number;
};

export type ScheduleEditorDto = {
    schedule: ScheduleDto;
    unassignedMatches: MatchSummaryDto[];
};

export type ScheduleAddressDto = {
    tournamentId: number;
    scheduleId: number;
};

export type ScheduleActivityDto = {
    running: boolean;
    archivedCount: number;
};
