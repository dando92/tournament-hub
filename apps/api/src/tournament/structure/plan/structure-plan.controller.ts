import { Body, Controller, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import type { StructurePlanAppliedDto } from '@tournament-hub/contracts';

import { ApplyStructurePlanDto } from '@tournament/structure/plan/structure-plan.requests';
import { StructurePlanCommands } from '@tournament/structure/plan/structure-plan.commands';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';

@UseGuards(TournamentOpenGuard)
@Controller('tournaments/:tournamentId/structure')
export class StructurePlanController {
    constructor(private readonly plans: StructurePlanCommands) {}

    @Post('plans')
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'tournamentId' })
    async apply(
        @Param('tournamentId') tournamentId: number,
        @Body(new ValidationPipe()) dto: ApplyStructurePlanDto,
    ): Promise<StructurePlanAppliedDto> {
        return this.plans.apply(Number(tournamentId), dto);
    }
}
