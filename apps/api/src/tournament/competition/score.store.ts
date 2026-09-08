import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player, Score, ScoreSource, Song } from '@tournament-hub/persistence';

export type RunInput = {
    playerId: number;
    songId: number;
    percentage: number;
    isFailed: boolean;
};

@Injectable()
export class ScoreStore {
    constructor(
        @InjectRepository(Score)
        private readonly scores: Repository<Score>,
    ) {}

    async record(runs: RunInput[], source: ScoreSource = 'manual'): Promise<Score[]> {
        if (runs.length === 0) return [];

        return await this.scores.save(runs.map((run) => this.scores.create({
            player: { id: run.playerId } as Player,
            song: { id: run.songId } as Song,
            percentage: run.percentage,
            isFailed: run.isFailed,
            source,
        })));
    }
}
