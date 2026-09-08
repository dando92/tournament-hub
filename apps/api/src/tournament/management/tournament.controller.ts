import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import {
    CreatedResourceDto,
    IssuedControlRoomKeyDto,
    MyTournamentRolesDto,
    TournamentConfigurationDto,
    TournamentDto,
    TournamentOverviewDto,
    TournamentRefDto,
} from '@tournament-hub/contracts';
import { CreateTournamentDto, UpdateTournamentDto } from '@tournament/management/tournament.requests';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CreatorOrAdminGuard } from '@auth/guards/owner-or-admin.guard';
import { TournamentAccessGuard } from '@auth/guards/tournament-access.guard';
import { AuthService } from '@auth/auth.service';
import { TournamentQueries } from '@tournament/management/tournament.queries';
import { TreeQueries } from '@tournament/structure/tree.queries';
import { TournamentCommands } from '@tournament/management/tournament.commands';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';
import { ControlRoomKeyStore } from '@tournament/control-room/control-room-key.store';

@UseGuards(TournamentOpenGuard)
@Controller('tournaments')
export class TournamentsController {
    constructor(
        private readonly authService: AuthService,
        private readonly tournamentQueries: TournamentQueries,
        private readonly treeQueries: TreeQueries,
        private readonly commands: TournamentCommands,
        private readonly controlRoomKeys: ControlRoomKeyStore,
    ) {}

    @UseGuards(JwtAuthGuard, CreatorOrAdminGuard)
    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateTournamentDto, @Request() req): Promise<CreatedResourceDto> {
        return { id: await this.commands.create({ ...dto, ownerAccountId: req.user?.id }) };
    }

    @Get('public')
    findAllPublic(): Promise<TournamentRefDto[]> {
        return this.tournamentQueries.publicList();
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-roles')
    async getMyRoles(@Request() req): Promise<MyTournamentRolesDto> {
        const roles = await this.tournamentQueries.rolesFor(req.user.id);
        const permissions = await this.authService.getPermissions(req.user.id);
        return {
            ...roles,
            isAdmin: permissions.isAdmin,
            canCreateTournament: permissions.isAdmin || permissions.isTournamentCreator,
        };
    }

    @Get(':id/overview')
    findOverview(@Param('id') id: number): Promise<TournamentOverviewDto> {
        return this.treeQueries.forTournament(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/configuration')
    async findConfiguration(@Param('id') id: number): Promise<TournamentConfigurationDto> {
        const configuration = await this.tournamentQueries.configuration(Number(id));
        if (!configuration) throw new NotFoundException(`Tournament with id ${id} not found`);
        return configuration;
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/startgg/api-key-status')
    async getStartggApiKeyStatus(@Param('id') id: number): Promise<{ hasStartggApiKey: boolean }> {
        const hasStartggApiKey = await this.tournamentQueries.hasStartggApiKey(Number(id));
        if (hasStartggApiKey === null) throw new NotFoundException(`Tournament with id ${id} not found`);
        return { hasStartggApiKey };
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/control-room-key')
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    async issueControlRoomKey(@Param('id') id: number): Promise<IssuedControlRoomKeyDto> {
        return { key: await this.controlRoomKeys.issue(Number(id)) };
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/control-room-key')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeControlRoomKey(@Param('id') id: number): Promise<void> {
        await this.controlRoomKeys.revoke(Number(id));
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<TournamentDto | null> {
        return this.tournamentQueries.byId(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Patch(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    async update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateTournamentDto): Promise<void> {
        await this.commands.update(Number(id), dto);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/close')
    @HttpCode(HttpStatus.NO_CONTENT)
    async close(@Param('id') id: number): Promise<void> {
        await this.commands.close(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/reopen')
    @HttpCode(HttpStatus.NO_CONTENT)
    async reopen(@Param('id') id: number): Promise<void> {
        await this.commands.reopen(Number(id));
    }
}
