import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import {
    CreatedResourceDto,
    DivisionStandingRowDto,
    DivisionSummaryDto,
    EntrantDto,
    GenerateBracketResultDto,
    ParticipantDto,
} from '@tournament-hub/contracts';
import { CreateDivisionDto, DivisionParticipantsDto, GenerateDivisionBracketDto, UpdateDivisionDto, UpdateDivisionSeedingDto } from './division.requests';
import { DivisionCommands } from '@tournament/structure/division/division.commands';
import { DivisionQueries } from '@tournament/structure/division/division.queries';
import { TreeQueries } from '@tournament/structure/tree.queries';
import { StandingsQueries } from '@tournament/competition/standings.queries';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';

@UseGuards(TournamentOpenGuard)
@Controller('divisions')
export class DivisionsController {
    constructor(
        private readonly divisionQueries: DivisionQueries,
        private readonly treeQueries: TreeQueries,
        private readonly standingsQueries: StandingsQueries,
        private readonly divisionCommands: DivisionCommands,
    ) {}

    private async assertExists(divisionId: number): Promise<void> {
        if (!(await this.divisionQueries.exists(divisionId))) throw new NotFoundException(`Division ${divisionId} not found`);
    }

    @Post()
    @RequireOpenTournament({ entity: 'tournament', location: 'body', field: 'tournamentId' })
    async create(@Body(new ValidationPipe()) dto: CreateDivisionDto): Promise<CreatedResourceDto> {
        return { id: await this.divisionCommands.create(dto) };
    }

    @Get(':id/summary')
    async findSummary(@Param('id') id: number): Promise<DivisionSummaryDto> {
        const division = await this.treeQueries.forDivision(Number(id));
        if (!division) throw new NotFoundException(`Division ${id} not found`);
        return division;
    }

    @Get(':id/standings')
    async findStandings(@Param('id') id: number): Promise<DivisionStandingRowDto[]> {
        await this.assertExists(Number(id));
        return this.standingsQueries.forDivision(Number(id));
    }

    @Post(':id/generate-bracket')
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'id' })
    async generateBracket(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: GenerateDivisionBracketDto,
    ): Promise<GenerateBracketResultDto> {
        return this.divisionCommands.generateBracket(Number(id), dto);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'id' })
    async update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateDivisionDto): Promise<void> {
        await this.divisionCommands.update(Number(id), dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'id' })
    async remove(@Param('id') id: number): Promise<void> {
        return this.divisionCommands.delete(Number(id));
    }

    @Get(':id/entrants')
    async getEntrants(@Param('id') id: number): Promise<EntrantDto[]> {
        await this.assertExists(Number(id));
        return this.divisionQueries.entrants(Number(id));
    }

    @Patch(':id/entrants/seeding')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'id' })
    async updateSeeding(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: UpdateDivisionSeedingDto,
    ): Promise<void> {
        return this.divisionCommands.updateSeeding(Number(id), dto.entrantIds);
    }

    @Get(':id/available-participants')
    async getAvailableParticipants(@Param('id') id: number): Promise<ParticipantDto[]> {
        await this.assertExists(Number(id));
        return this.divisionQueries.availableParticipants(Number(id));
    }

    @Post(':id/participants')
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'id' })
    async addParticipantsToDivision(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: DivisionParticipantsDto,
    ): Promise<CreatedResourceDto[]> {
        const entrantIds = await this.divisionCommands.addParticipants(Number(id), dto.participantIds);

        return entrantIds.map((entrantId) => ({ id: entrantId }));
    }

    @Delete(':id/participants')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'id' })
    async removeParticipantsFromDivision(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: DivisionParticipantsDto,
    ): Promise<void> {
        return this.divisionCommands.removeParticipants(Number(id), dto.participantIds);
    }
}
