import axios from 'axios';
import type { DivisionPlacementsDto, PlayerStatsRowDto, SongStatsRowDto } from '@tournament-hub/contracts';

export async function listPlacements(tournamentId: number): Promise<DivisionPlacementsDto[]> {
    const response = await axios.get<DivisionPlacementsDto[]>(`tournaments/${tournamentId}/stats/placements`);

    return response.data;
}

export async function listSongStats(tournamentId: number): Promise<SongStatsRowDto[]> {
    const response = await axios.get<SongStatsRowDto[]>(`tournaments/${tournamentId}/stats/songs`);

    return response.data;
}

export async function listPlayerStats(tournamentId: number): Promise<PlayerStatsRowDto[]> {
    const response = await axios.get<PlayerStatsRowDto[]>(`tournaments/${tournamentId}/stats/players`);

    return response.data;
}
