import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ScoreDto } from '@tournament-hub/contracts';
import { ScoreQueries } from '@tournament/competition/score.queries';

@Controller('scores')
export class ScoresController {
    constructor(
        private readonly scoreQueries: ScoreQueries,
    ) {}

    @Get()
    find(@Query('songId') songId: string, @Query('playerId') playerId: string): Promise<ScoreDto[]> {
        return this.scoreQueries.history(this.identifier(songId, 'songId'), this.identifier(playerId, 'playerId'));
    }

    private identifier(value: string, name: string): number {
        const identifier = Number(value);
        if (!Number.isInteger(identifier)) throw new BadRequestException(`${name} is required and must be an integer`);

        return identifier;
    }
}
