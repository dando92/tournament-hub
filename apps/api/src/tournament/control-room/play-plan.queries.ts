import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { PlayPlanLaneDto } from '@tournament/control-room/play-plan.contract';

type LaneRow = {
    scheduleId: number;
    name: string;
    matchId: number | null;
    matchName: string | null;
    players: Array<{ id: number; name: string }> | null;
    songs: Array<{ songId: number; title: string }> | null;
};

const LANES_OF_TOURNAMENT = `
    WITH lane AS (
        SELECT      s."id"   AS "scheduleId",
                    s."name" AS "name",
                    m."id"   AS "matchId",
                    m."name" AS "matchName"
        FROM        "schedule" s
        LEFT JOIN   "schedule_entry" e ON e."id" = s."currentEntryId"
        LEFT JOIN   "match" m ON m."id" = e."matchId"
        WHERE       s."tournamentId" = $1
            AND     s."status" = 'running'
            AND     s."archivedAt" IS NULL
    ),
    lane_player AS (
        SELECT DISTINCT
                l."matchId"      AS "matchId",
                pl."id"          AS "playerId",
                pl."playerName"  AS "playerName"
        FROM    lane l
        JOIN    "match_entrants_entrant" me ON me."matchId" = l."matchId"
        JOIN    "entrant_participants_participant" ep ON ep."entrantId" = me."entrantId"
        JOIN    "participant" pa ON pa."id" = ep."participantId"
        JOIN    "player" pl ON pl."id" = pa."playerId"
    ),
    lane_players AS (
        SELECT      "matchId",
                    json_agg(json_build_object('id', "playerId", 'name', "playerName")
                             ORDER BY LOWER("playerName"), "playerId") AS "players"
        FROM        lane_player
        GROUP BY    "matchId"
    ),
    playable AS (
        SELECT  l."matchId" AS "matchId",
                r."songId"  AS "songId",
                r."id"      AS "ordinal"
        FROM    lane l
        JOIN    "round" r ON r."matchId" = l."matchId"
        WHERE   r."songId" IS NOT NULL

        UNION ALL

        SELECT  l."matchId",
                mt."songId",
                mt."id" + 1000000
        FROM    lane l
        JOIN    "match_tiebreak" mt ON mt."matchId" = l."matchId"
        WHERE   mt."invalidated" = FALSE
            AND mt."songId" IS NOT NULL
    ),
    lane_song AS (
        SELECT      p."matchId"        AS "matchId",
                    so."id"            AS "songId",
                    so."title"         AS "title",
                    MIN(p."ordinal")   AS "ordinal"
        FROM        playable p
        JOIN        "song" so ON so."id" = p."songId"
        GROUP BY    p."matchId", so."id", so."title"
    ),
    lane_songs AS (
        SELECT      "matchId",
                    json_agg(json_build_object('songId', "songId", 'title', "title")
                             ORDER BY "ordinal", "songId") AS "songs"
        FROM        lane_song
        GROUP BY    "matchId"
    )
    SELECT      l."scheduleId"                        AS "scheduleId",
                l."name"                              AS "name",
                l."matchId"                           AS "matchId",
                l."matchName"                         AS "matchName",
                COALESCE(pl."players", '[]'::json)    AS "players",
                COALESCE(so."songs", '[]'::json)      AS "songs"
    FROM        lane l
    LEFT JOIN   lane_players pl ON pl."matchId" = l."matchId"
    LEFT JOIN   lane_songs so ON so."matchId" = l."matchId"
    ORDER BY    l."scheduleId"
`;

@Injectable()
export class PlayPlanQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async lanesOf(tournamentId: number): Promise<PlayPlanLaneDto[]> {
        const rows: LaneRow[] = await this.dataSource.query(LANES_OF_TOURNAMENT, [tournamentId]);

        return rows.map((row) => ({
            scheduleId: row.scheduleId,
            name: row.name,
            current: row.matchId
                ? { id: `match:${row.matchId}`, name: row.matchName ?? '', players: row.players ?? [], songs: row.songs ?? [] }
                : null,
        }));
    }
}
