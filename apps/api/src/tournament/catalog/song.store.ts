import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChartDifficulty, Song, Tournament } from '@tournament-hub/persistence';

export type SongInput = {
    title: string;
    artist?: string;
    group: string;
    difficulty: number;
    chartDifficulty?: ChartDifficulty | null;
    tournamentId?: number;
};

export type SongImportOutcome = {
    imported: number;
    skipped: number;
};

function identity(input: { title: string; group: string; difficulty: number }): string {
    return `${input.title}\u0000${input.group}\u0000${input.difficulty}`;
}

function chunks<T>(rows: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let index = 0; index < rows.length; index += size) batches.push(rows.slice(index, index + size));

    return batches;
}

@Injectable()
export class SongStore {
    constructor(
        @InjectRepository(Song)
        private readonly songs: Repository<Song>,
        @InjectRepository(Tournament)
        private readonly tournaments: Repository<Tournament>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async loadTournament(tournamentId: number): Promise<Tournament> {
        const tournament = await this.tournaments.findOneBy({ id: tournamentId });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        return tournament;
    }

    async add(input: SongInput, tournament: Tournament | null): Promise<Song> {
        const song = this.songs.create({
            title: input.title,
            artist: input.artist,
            group: input.group,
            difficulty: input.difficulty,
            chartDifficulty: input.chartDifficulty ?? null,
        });
        song.tournament = tournament;

        return await this.songs.save(song);
    }

    async import(inputs: SongInput[], tournament: Tournament): Promise<SongImportOutcome> {
        return await this.dataSource.transaction(async (manager) => {
            const songs = manager.getRepository(Song);
            const existing: Array<{ title: string; group: string; difficulty: number }> = await songs.find({
                select: { title: true, group: true, difficulty: true },
                where: { tournament: { id: tournament.id } },
            });
            const seen = new Set(existing.map(identity));

            const rows = inputs.filter((input) => {
                const key = identity(input);
                if (seen.has(key)) return false;

                seen.add(key);
                return true;
            });

            for (const chunk of chunks(rows, 500)) {
                await songs.save(
                    chunk.map((input) =>
                        songs.create({
                            title: input.title,
                            artist: input.artist,
                            group: input.group,
                            difficulty: input.difficulty,
                            chartDifficulty: input.chartDifficulty ?? null,
                            tournament,
                        }),
                    ),
                );
            }

            return { imported: rows.length, skipped: inputs.length - rows.length };
        });
    }

    async remove(songId: number): Promise<number | null> {
        const song = await this.songs.findOne({ where: { id: songId }, relations: { tournament: true } });
        if (!song) return null;

        const tournamentId = song.tournament?.id ?? null;
        await this.songs.remove(song);

        return tournamentId;
    }
}
