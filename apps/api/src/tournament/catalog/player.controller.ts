import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { EntrantDto, PlayerRefDto } from '@tournament-hub/contracts';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { PlayerQueries } from '@tournament/catalog/player.queries';
import { BulkAddPlayersToDivisionDto } from '@tournament/catalog/player.requests';
import { ParticipantsCommands } from '@tournament/registration/participants.commands';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';

@UseGuards(TournamentOpenGuard)
@Controller('players')
export class PlayersController {
    constructor(
        private readonly players: PlayerQueries,
        private readonly registration: ParticipantsCommands,
    ) {}

    @Get()
    async findAll(): Promise<PlayerRefDto[]> {
        return this.players.all();
    }

    @UseGuards(JwtAuthGuard)
    @Post(':playerId/divisions/:divisionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'divisionId' })
    async assignToDivision(
        @Param('playerId') playerId: number,
        @Param('divisionId') divisionId: number,
    ): Promise<void> {
        return this.registration.assignPlayerToDivision(Number(playerId), Number(divisionId));
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':playerId/divisions/:divisionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'divisionId' })
    async removeFromDivision(
        @Param('playerId') playerId: number,
        @Param('divisionId') divisionId: number,
    ): Promise<void> {
        return this.registration.removePlayerFromDivision(Number(playerId), Number(divisionId));
    }

    @UseGuards(JwtAuthGuard)
    @Post('divisions/:divisionId/bulk')
    @RequireOpenTournament({ entity: 'division', location: 'params', field: 'divisionId' })
    async bulkAddToDivision(
        @Param('divisionId') divisionId: number,
        @Body(new ValidationPipe()) dto: BulkAddPlayersToDivisionDto,
    ): Promise<{ entrants: EntrantDto[]; warnings: string[] }> {
        return this.registration.addPlayersToDivision(dto.playerNames, Number(divisionId));
    }
}
