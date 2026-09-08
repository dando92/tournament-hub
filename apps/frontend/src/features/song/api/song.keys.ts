export const songKeys = {
  forTournament: (tournamentId?: number) =>
    ["songs", "tournament", tournamentId ?? "all"] as const,
};
