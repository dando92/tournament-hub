import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '@tournament-hub/persistence';
import { ScoreDto } from '@tournament-hub/contracts';

@Injectable()
export class ScoreQueries {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
    ) {}

    async history(songId: number, playerId: number): Promise<ScoreDto[]> {
        const scores = await this.scoreRepository.createQueryBuilder('score')
            .select(['score.id', 'score.percentage', 'score.isFailed'])
            .where('score.songId = :songId', { songId })
            .andWhere('score.playerId = :playerId', { playerId })
            .andWhere('NOT EXISTS (SELECT 1 FROM "standing" standing WHERE standing."scoreId" = score.id)')
            .andWhere('NOT EXISTS (SELECT 1 FROM "match_tiebreak_standing" standing WHERE standing."scoreId" = score.id)')
            .orderBy('score.id', 'DESC')
            .getMany();

        return scores.map((score) => ({
            id: score.id,
            percentage: score.percentage,
            isFailed: score.isFailed,
        }));
    }
}
