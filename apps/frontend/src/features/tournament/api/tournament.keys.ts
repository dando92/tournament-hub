export const tournamentKeys = {
  publicList: () => ["tournaments", "public"] as const,
  overview: (tournamentId: number) => ["tournament-overview", tournamentId] as const,
  configuration: (tournamentId: number) => ["tournament-configuration", tournamentId] as const,
};
