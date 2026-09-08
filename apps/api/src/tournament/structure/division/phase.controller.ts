import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { CreatedResourceDto } from '@tournament-hub/contracts';
import { CreatePhaseDto, UpdatePhaseDto } from '@tournament/structure/division/phase.requests';
import { DivisionCommands } from '@tournament/structure/division/division.commands';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';

@UseGuards(TournamentOpenGuard)
@Controller('phases')
export class PhasesController {
    constructor(private readonly divisions: DivisionCommands) {}

    @Post()
    @RequireOpenTournament({ entity: 'division', location: 'body', field: 'divisionId' })
    async create(@Body(new ValidationPipe()) dto: CreatePhaseDto): Promise<CreatedResourceDto> {
        return { id: await this.divisions.addPhase(dto.divisionId, dto.name) };
    }

    @Patch(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'phase', location: 'params', field: 'id' })
    async update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdatePhaseDto): Promise<void> {
        await this.divisions.renamePhase(Number(id), dto.name);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'phase', location: 'params', field: 'id' })
    async remove(@Param('id') id: number): Promise<void> {
        await this.divisions.removePhase(Number(id));
    }
}
