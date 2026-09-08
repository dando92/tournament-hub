import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, Put, UseGuards, ValidationPipe } from "@nestjs/common";
import { CreatedResourceDto } from "@tournament-hub/contracts";

import { MatchCommands } from "@match/match.commands";
import { UpsertPointsDto, UpsertScoreDto } from "@match/rounds.requests";
import { CreateMatchTiebreakDto } from "@match/tiebreak.requests";
import { RequireOpenTournament, TournamentOpenGuard } from "@tournament/shared/tournament-open.guard";

@UseGuards(TournamentOpenGuard)
@Controller("matches/:matchId/tiebreaks")
export class TiebreakController {
    constructor(private readonly matchCommands: MatchCommands) {}

    @Post()
    @RequireOpenTournament({ entity: "match", location: "params", field: "matchId" })
    async create(
        @Param("matchId") matchId: number,
        @Body(new ValidationPipe()) dto: CreateMatchTiebreakDto,
    ): Promise<CreatedResourceDto> {
        return { id: await this.matchCommands.addTiebreak(Number(matchId), dto.playerIds, dto.songId) };
    }

    @Delete(":tiebreakId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "match", location: "params", field: "matchId" })
    remove(@Param("matchId") matchId: number, @Param("tiebreakId") tiebreakId: number): Promise<void> {
        return this.matchCommands.removeTiebreak(Number(matchId), Number(tiebreakId));
    }

    @Put(":tiebreakId/scores/:playerId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "match", location: "params", field: "matchId" })
    upsertScore(
        @Param("matchId") matchId: number,
        @Param("tiebreakId") tiebreakId: number,
        @Param("playerId") playerId: number,
        @Body(new ValidationPipe()) dto: UpsertScoreDto,
    ): Promise<void> {
        return this.matchCommands.upsertTiebreakScore(Number(matchId), Number(tiebreakId), Number(playerId), dto);
    }

    @Put(":tiebreakId/points/:playerId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "match", location: "params", field: "matchId" })
    upsertPoints(
        @Param("matchId") matchId: number,
        @Param("tiebreakId") tiebreakId: number,
        @Param("playerId") playerId: number,
        @Body(new ValidationPipe()) dto: UpsertPointsDto,
    ): Promise<void> {
        return this.matchCommands.upsertTiebreakPoints(Number(matchId), Number(tiebreakId), Number(playerId), dto.points);
    }

    @Delete(":tiebreakId/standings/:playerId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequireOpenTournament({ entity: "match", location: "params", field: "matchId" })
    clearStanding(
        @Param("matchId") matchId: number,
        @Param("tiebreakId") tiebreakId: number,
        @Param("playerId") playerId: number,
    ): Promise<void> {
        return this.matchCommands.clearTiebreakStanding(Number(matchId), Number(tiebreakId), Number(playerId));
    }
}
