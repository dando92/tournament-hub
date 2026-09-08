import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { CreatedResourceDto } from '@tournament-hub/contracts';
import { CreatePhaseGroupDto, UpdatePhaseGroupDto } from '@tournament/structure/phase-group/phase-group.requests';
import { PhaseGroupCommands } from '@tournament/structure/phase-group/phase-group.commands';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';

@UseGuards(TournamentOpenGuard)
@Controller()
export class PhaseGroupsController {
    constructor(private readonly commands: PhaseGroupCommands) {}

    @Post('phases/:phaseId/phase-groups')
    @RequireOpenTournament({ entity: 'phase', location: 'params', field: 'phaseId' })
    async createForPhase(
        @Param('phaseId') phaseId: number,
        @Body(new ValidationPipe()) dto: CreatePhaseGroupDto,
    ): Promise<CreatedResourceDto> {
        return { id: await this.commands.create(Number(phaseId), dto) };
    }

    @Patch('phase-groups/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'phase-group', location: 'params', field: 'id' })
    async update(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: UpdatePhaseGroupDto,
    ): Promise<void> {
        await this.commands.update(Number(id), dto);
    }

    @Delete('phase-groups/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'phase-group', location: 'params', field: 'id' })
    async delete(@Param('id') id: number): Promise<void> {
        await this.commands.delete(Number(id));
    }
}
