import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards, ValidationPipe } from "@nestjs/common";
import type { ScheduleActivityDto, ScheduleCreationDto, ScheduleEditorDto, ScheduleDto, CreatedResourceDto } from "@tournament-hub/contracts";

import { RequireOpenTournament, TournamentOpenGuard } from "@tournament/shared/tournament-open.guard";
import { ScheduleCommands } from "./schedule.commands";
import { ScheduleQueries } from "./schedule.queries";
import { CreateScheduleDto, ReplaceScheduleEntriesDto, UpdateScheduleEntryTimeDto, UpdateScheduleDto } from "./schedule.requests";

@UseGuards(TournamentOpenGuard)
@Controller()
export class ScheduleController {
    constructor(
        private readonly commands: ScheduleCommands,
        private readonly queries: ScheduleQueries,
    ) {}

    @Get("tournaments/:tournamentId/schedules")
    list(@Param("tournamentId") tournamentId: number, @Query("archived") archived?: string): Promise<ScheduleDto[]> {
        return this.queries.forTournament(Number(tournamentId), archived === "true");
    }

    @Get("tournaments/:tournamentId/schedules/activity")
    activity(@Param("tournamentId") tournamentId: number): Promise<ScheduleActivityDto> {
        return this.queries.activity(Number(tournamentId));
    }

    @Get("tournaments/:tournamentId/schedules/creation")
    creation(@Param("tournamentId") tournamentId: number): Promise<ScheduleCreationDto> {
        return this.queries.creation(Number(tournamentId));
    }

    @Post("tournaments/:tournamentId/schedules")
    @RequireOpenTournament({ entity: "tournament", location: "params", field: "tournamentId" })
    async create(@Param("tournamentId") tournamentId: number, @Body(new ValidationPipe()) dto: CreateScheduleDto): Promise<CreatedResourceDto> {
        return {
            id: await this.commands.create(
                Number(tournamentId),
                dto.name,
                new Date(dto.willStartAt),
                dto.defaultExpectedDurationMinutes,
                dto.matchIds,
            ),
        };
    }

    @Get("schedules/:scheduleId")
    read(@Param("scheduleId") scheduleId: number): Promise<ScheduleDto> {
        return this.queries.byId(Number(scheduleId));
    }

    @Get("schedules/:scheduleId/editor")
    editor(@Param("scheduleId") scheduleId: number): Promise<ScheduleEditorDto> {
        return this.queries.editor(Number(scheduleId));
    }

    @Patch("schedules/:scheduleId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    updateDetails(@Param("scheduleId") scheduleId: number, @Body(new ValidationPipe()) dto: UpdateScheduleDto): Promise<void> {
        return this.commands.updateDetails(Number(scheduleId), dto.name, new Date(dto.willStartAt));
    }

    @Delete("schedules/:scheduleId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    remove(@Param("scheduleId") scheduleId: number): Promise<void> {
        return this.commands.remove(Number(scheduleId));
    }

    @Put("schedules/:scheduleId/entries")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    replaceEntries(@Param("scheduleId") scheduleId: number, @Body(new ValidationPipe()) dto: ReplaceScheduleEntriesDto): Promise<void> {
        return this.commands.replaceEntries(Number(scheduleId), dto.version, dto.entries);
    }

    @Patch("schedules/:scheduleId/entries/:entryId/time")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    updateEntryTime(
        @Param("scheduleId") scheduleId: number,
        @Param("entryId") entryId: number,
        @Body(new ValidationPipe()) dto: UpdateScheduleEntryTimeDto,
    ): Promise<void> {
        return this.commands.updateExpectedDuration(Number(scheduleId), Number(entryId), dto.expectedDurationMinutes);
    }

    @Post("schedules/:scheduleId/start")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    start(@Param("scheduleId") scheduleId: number): Promise<void> {
        return this.commands.start(Number(scheduleId));
    }

    @Post("schedules/:scheduleId/start-from/:entryId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    startFrom(@Param("scheduleId") scheduleId: number, @Param("entryId") entryId: number): Promise<void> {
        return this.commands.start(Number(scheduleId), Number(entryId));
    }

    @Post("schedules/:scheduleId/stop")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "schedule", location: "params", field: "scheduleId" })
    stop(@Param("scheduleId") scheduleId: number): Promise<void> {
        return this.commands.stop(Number(scheduleId));
    }

    @Post("schedules/:scheduleId/archive")
    @HttpCode(HttpStatus.NO_CONTENT)
    archive(@Param("scheduleId") scheduleId: number): Promise<void> {
        return this.commands.archive(Number(scheduleId));
    }

    @Delete("schedules/:scheduleId/archive")
    @HttpCode(HttpStatus.NO_CONTENT)
    unarchive(@Param("scheduleId") scheduleId: number): Promise<void> {
        return this.commands.unarchive(Number(scheduleId));
    }
}
