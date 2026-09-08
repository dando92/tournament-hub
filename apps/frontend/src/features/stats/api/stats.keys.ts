export const statsKeys = {
    placements: (tournamentId: number) => ['stats', 'placements', tournamentId] as const,
    songs: (tournamentId: number) => ['stats', 'songs', tournamentId] as const,
    players: (tournamentId: number) => ['stats', 'players', tournamentId] as const,
};
