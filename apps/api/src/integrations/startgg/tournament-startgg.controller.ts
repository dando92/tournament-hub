import { Body, Controller, Param, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { TournamentAccessGuard } from '@auth/guards/tournament-access.guard';
import { RequireOpenTournament, TournamentOpenGuard } from '@tournament/shared/tournament-open.guard';
import { StartggImportPreviewDto } from './startgg.dto';
import { StartggService } from './startgg.service';

@UseGuards(TournamentOpenGuard)
@Controller('tournaments')
export class TournamentStartggController {
    constructor(private readonly startggService: StartggService) {}

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/startgg/import-preview')
    previewStartggImport(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: StartggImportPreviewDto,
        @Request() req,
    ) {
        return this.startggService.previewImport({
            ...dto,
            targetTournamentId: Number(id),
        }, req.user);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/startgg/import')
    @RequireOpenTournament({ entity: 'tournament', location: 'params', field: 'id' })
    importStartggEvent(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: StartggImportPreviewDto,
        @Request() req,
    ) {
        return this.startggService.importEvent({
            ...dto,
            targetTournamentId: Number(id),
        }, req.user);
    }
}
