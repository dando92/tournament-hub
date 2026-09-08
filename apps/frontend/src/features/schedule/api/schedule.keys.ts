export const scheduleKeys = {
    all: (tournamentId: number) => ["schedules", tournamentId] as const,
    list: (tournamentId: number, archived: boolean) => ["schedules", tournamentId, archived ? "archived" : "live"] as const,
    lists: (tournamentId: number) => [scheduleKeys.list(tournamentId, false), scheduleKeys.list(tournamentId, true)],
    activity: (tournamentId: number) => ["schedule-activity", tournamentId] as const,
    creation: (tournamentId: number) => ["schedules", "creation", tournamentId] as const,
    editor: (scheduleId: number) => ["schedules", "editor", scheduleId] as const,
};
