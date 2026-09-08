import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { CreatedResourceDto, ParticipantDto, ParticipantImportPreviewRowDto } from '@tournament-hub/contracts';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { TournamentAccessGuard } from '@auth/guards/tournament-access.guard';
import {
    CreateParticipantDto,
    ImportParticipantsDto,
    ImportParticipantsPreviewDto,
} from '@tournament/registration/participants.requests';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';
import { ParticipantQueries } from '@tournament/registration/participants.queries';
import { ParticipantsCommands } from '@tournament/registration/participants.commands';

@UseGuards(TournamentOpenGuard)
@Controller('tournaments')
export class TournamentParticipantsController {
    constructor(
        private readonly participantQueries: ParticipantQueries,
        private readonly commands: ParticipantsCommands,
    ) {}

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/participants')
    listParticipants(@Param('id') id: number): Promise<ParticipantDto[]> {
        return this.participantQueries.forTournament(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/participants')
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    async createParticipant(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: CreateParticipantDto,
    ): Promise<CreatedResourceDto> {
        return { id: await this.commands.register(Number(id), dto) };
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/participants/:participantId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    removeParticipant(
        @Param('id') id: number,
        @Param('participantId') participantId: number,
    ): Promise<void> {
        return this.commands.remove(Number(id), Number(participantId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/participants/import-preview')
    previewParticipantImport(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: ImportParticipantsPreviewDto,
    ): Promise<ParticipantImportPreviewRowDto[]> {
        return this.participantQueries.importPreview(Number(id), dto.playerNames);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/participants/import')
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    async importParticipants(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: ImportParticipantsDto,
    ): Promise<CreatedResourceDto[]> {
        const registered = await this.commands.importAll(Number(id), dto.entries);

        return registered.map((participantId) => ({ id: participantId }));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/participants/:participantId/staff')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    async addParticipantStaffRole(
        @Param('id') id: number,
        @Param('participantId') participantId: number,
    ): Promise<void> {
        await this.commands.grantStaff(Number(id), Number(participantId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/participants/:participantId/staff')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    async removeParticipantStaffRole(
        @Param('id') id: number,
        @Param('participantId') participantId: number,
    ): Promise<void> {
        await this.commands.revokeStaff(Number(id), Number(participantId));
    }
}
