import { useQuery } from '@tanstack/react-query';

import { listPlacements, listPlayerStats, listSongStats } from '@/features/stats/api/stats.api';
import { statsKeys } from '@/features/stats/api/stats.keys';

export function useTournamentStats(tournamentId: number) {
    const placements = useQuery({
        queryKey: statsKeys.placements(tournamentId),
        queryFn: () => listPlacements(tournamentId),
        enabled: Number.isFinite(tournamentId),
    });

    const players = useQuery({
        queryKey: statsKeys.players(tournamentId),
        queryFn: () => listPlayerStats(tournamentId),
        enabled: Number.isFinite(tournamentId),
    });

    const songs = useQuery({
        queryKey: statsKeys.songs(tournamentId),
        queryFn: () => listSongStats(tournamentId),
        enabled: Number.isFinite(tournamentId),
    });

    return { placements, players, songs };
}
