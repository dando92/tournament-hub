import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';

import { AccountCommands } from '@account/account.commands';
import { AccountQueries } from '@account/account.queries';
import { CreateAccountPlayerDto } from '@account/account.requests';
import { AdminGuard } from '@auth/guards/admin.guard';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CreatorOrAdminGuard } from '@auth/guards/owner-or-admin.guard';

@Controller('user')
export class AccountController {
    constructor(
        private readonly commands: AccountCommands,
        private readonly queries: AccountQueries,
    ) {}

    @Post()
    create(@Body(new ValidationPipe()) dto: CreateAccountPlayerDto) {
        return this.commands.create(dto);
    }

    @UseGuards(JwtAuthGuard, CreatorOrAdminGuard)
    @Get()
    findAll() {
        return this.queries.allForAdministration();
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/profile')
    updateProfile(
        @Param('id') id: string,
        @Body() body: { playerName?: string; nationality?: string; grooveStatsApi?: string; profilePicture?: string },
        @Request() req,
    ) {
        if (req.user.id !== id) throw new ForbiddenException();
        return this.commands.updateProfile(id, body);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Patch(':id/flags')
    updateFlags(
        @Param('id') id: string,
        @Body() body: { isAdmin?: boolean; isTournamentCreator?: boolean },
    ) {
        return this.commands.updateFlags(id, body);
    }
}
