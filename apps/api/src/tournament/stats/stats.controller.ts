import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DivisionPlacementsDto, PlayerStatsRowDto, SongStatsRowDto } from '@tournament-hub/contracts';

import { StatsQueries } from '@tournament/stats/stats.queries';
import { TournamentQueries } from '@tournament/management/tournament.queries';

@Controller('tournaments')
export class TournamentStatsController {
    constructor(
        private readonly stats: StatsQueries,
        private readonly tournaments: TournamentQueries,
    ) {}

    private async assertExists(tournamentId: number): Promise<void> {
        if (!(await this.tournaments.byId(tournamentId))) {
            throw new NotFoundException(`Tournament ${tournamentId} not found`);
        }
    }

    @Get(':id/stats/placements')
    async placements(@Param('id') id: number): Promise<DivisionPlacementsDto[]> {
        await this.assertExists(Number(id));

        return this.stats.placementsForTournament(Number(id));
    }

    @Get(':id/stats/songs')
    async songs(@Param('id') id: number): Promise<SongStatsRowDto[]> {
        await this.assertExists(Number(id));

        return this.stats.songsForTournament(Number(id));
    }

    @Get(':id/stats/players')
    async players(@Param('id') id: number): Promise<PlayerStatsRowDto[]> {
        await this.assertExists(Number(id));

        return this.stats.playersForTournament(Number(id));
    }
}
