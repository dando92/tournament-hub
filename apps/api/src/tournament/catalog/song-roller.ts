import { Injectable } from '@nestjs/common';
import { SongRollSlotDto } from '@tournament-hub/contracts';

import { SongQueries } from '@tournament/catalog/song.queries';

export type SongRollRequest = {
    tournamentId: number;
    divisionId: number;
    group: string | null;
    levels: number[];
    allowPlayed?: boolean;
    excludeSongIds?: number[];
    matchId?: number | null;
};

export function parseLevels(levels: string): number[] {
    return levels
        .split(/[^0-9]+/)
        .filter((part) => part.length > 0)
        .map((part) => parseInt(part, 10));
}

@Injectable()
export class SongRoller {
    constructor(private readonly songs: SongQueries) {}

    async roll(request: SongRollRequest): Promise<SongRollSlotDto[]> {
        if (request.levels.length === 0) {
            return [];
        }

        const available = await this.songs.rollable(request.tournamentId, request.divisionId, request.group, {
            allowPlayed: request.allowPlayed,
            matchId: request.matchId,
        });
        const taken = new Set(request.excludeSongIds ?? []);

        return request.levels.map((level) => {
            const song = this.anyOf(available.filter((candidate) => candidate.difficulty === level && !taken.has(candidate.id)));
            if (song) {
                taken.add(song.id);
            }

            return { level, song };
        });
    }

    private anyOf<T>(candidates: T[]): T | null {
        if (candidates.length === 0) {
            return null;
        }

        return candidates[Math.floor(Math.random() * candidates.length)];
    }
}
