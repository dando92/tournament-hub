import { Body, Controller, Get, Headers, HttpStatus, Post, Req, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';

import { ControlRoomKeyGuard, type ControlRoomRequest } from '@tournament/control-room/control-room-key.guard';
import type { ControlRoomSessionDto, ReportRunsResultDto } from '@tournament/control-room/play-plan.contract';
import { PlayPlanService } from '@tournament/control-room/play-plan.service';
import { ReportRunsDto } from '@tournament/control-room/run-report.requests';
import { RunIngestService } from '@tournament/control-room/run-ingest.service';

@UseGuards(ControlRoomKeyGuard)
@Controller('v1')
export class ControlRoomController {
    constructor(
        private readonly plans: PlayPlanService,
        private readonly runs: RunIngestService,
    ) {}

    @Get('session')
    session(@Req() request: ControlRoomRequest): ControlRoomSessionDto {
        const { tournamentId, name, status } = request.controlRoom;

        return { tournamentId, name, status };
    }

    @Get('play-plan')
    async playPlan(
        @Req() request: ControlRoomRequest,
        @Res() response: Response,
        @Headers('if-none-match') ifNoneMatch?: string,
    ): Promise<void> {
        const read = await this.plans.read(request.controlRoom.tournamentId, ifNoneMatch);
        response.setHeader('ETag', read.etag);
        response.setHeader('Cache-Control', 'no-cache');
        if (!read.changed) {
            response.status(HttpStatus.NOT_MODIFIED).end();

            return;
        }

        response.status(HttpStatus.OK).json(read.plan);
    }

    @Post('runs')
    report(@Req() request: ControlRoomRequest, @Body(new ValidationPipe({ whitelist: true })) body: ReportRunsDto): Promise<ReportRunsResultDto> {
        return this.runs.submit(request.controlRoom.tournamentId, body);
    }
}
