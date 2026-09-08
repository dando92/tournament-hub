export const participantKeys = {
  forTournament: (tournamentId: number) => ["participants", "tournament", tournamentId] as const,
  players: () => ["players"] as const,
};
