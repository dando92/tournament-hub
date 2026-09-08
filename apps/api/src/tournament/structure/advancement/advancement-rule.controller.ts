import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { AdvancementCompetitionKind } from '@tournament-hub/persistence';
import { UpdateAdvancementRulesDto } from './advancement-rule.requests';
import { AdvancementRuleCommands } from './advancement-rule.commands';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';

@UseGuards(TournamentOpenGuard)
@Controller('advancement-rules')
export class AdvancementRulesController {
    constructor(private readonly advancementRules: AdvancementRuleCommands) {}

    @Put('sources/:sourceKind/:sourceId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'advancement-source', location: 'params', field: 'sourceId' })
    async updateForSource(
        @Param('sourceKind') sourceKind: AdvancementCompetitionKind,
        @Param('sourceId') sourceId: number,
        @Body(new ValidationPipe()) dto: UpdateAdvancementRulesDto,
    ): Promise<void> {
        return this.advancementRules.updateForSource(sourceKind, Number(sourceId), dto.rules);
    }
}

