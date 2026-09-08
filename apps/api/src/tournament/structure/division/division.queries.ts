import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EntrantDto, ParticipantDto } from '@tournament-hub/contracts';

type EntrantRow = EntrantDto;

const ENTRANTS_OF_DIVISION = `
    SELECT  e."id"     AS "id",
            e."name"   AS "name",
            e."type"   AS "type",
            e."status" AS "status",
            COALESCE(participants."json", '[]'::json) AS "participants"
    FROM        "entrant" e
    LEFT JOIN LATERAL (
        SELECT  json_agg(
                    json_build_object(
                        'id', pa."id",
                        'roles', to_json(pa."roles"),
                        'status', pa."status",
                        'player', json_build_object('id', pl."id", 'playerName', pl."playerName")
                    ) ORDER BY pa."id"
                ) AS "json"
        FROM    "entrant_participants_participant" ep
        JOIN    "participant" pa ON pa."id" = ep."participantId"
        JOIN    "player" pl ON pl."id" = pa."playerId"
        WHERE   ep."entrantId" = e."id"
    ) participants ON TRUE
    WHERE    e."divisionId" = $1
    ORDER BY e."seedNum" ASC NULLS LAST, LOWER(e."name"), e."id"
`;

type AvailableParticipantRow = ParticipantDto;

const AVAILABLE_PARTICIPANTS_OF_DIVISION = `
    SELECT  pa."id"     AS "id",
            to_json(pa."roles") AS "roles",
            pa."status" AS "status",
            json_build_object('id', pl."id", 'playerName', pl."playerName") AS "player"
    FROM    "participant" pa
    JOIN    "player" pl ON pl."id" = pa."playerId"
    JOIN    "division" d ON d."id" = $1 AND d."tournamentId" = pa."tournamentId"
    WHERE   NOT EXISTS (
        SELECT  1
        FROM    "entrant_participants_participant" ep
        JOIN    "entrant" e ON e."id" = ep."entrantId"
        WHERE   ep."participantId" = pa."id"
            AND e."divisionId" = $1
            AND e."status" = 'active'
    )
    ORDER BY pa."id"
`;

const TOURNAMENT_ID_OF_DIVISION = `
    SELECT  d."tournamentId" AS "tournamentId"
    FROM    "division" d
    WHERE   d."id" = $1
`;

const DIVISION_EXISTS = `
    SELECT  1
    FROM    "division" d
    WHERE   d."id" = $1
`;

@Injectable()
export class DivisionQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async entrants(divisionId: number): Promise<EntrantDto[]> {
        const rows: EntrantRow[] = await this.dataSource.query(ENTRANTS_OF_DIVISION, [divisionId]);

        return rows;
    }

    async availableParticipants(divisionId: number): Promise<ParticipantDto[]> {
        const rows: AvailableParticipantRow[] = await this.dataSource.query(AVAILABLE_PARTICIPANTS_OF_DIVISION, [divisionId]);

        return rows;
    }

    async tournamentIdOf(divisionId: number): Promise<number | null> {
        const rows: Array<{ tournamentId: number | null }> = await this.dataSource.query(TOURNAMENT_ID_OF_DIVISION, [divisionId]);

        return rows[0]?.tournamentId ?? null;
    }

    async exists(divisionId: number): Promise<boolean> {
        const rows: unknown[] = await this.dataSource.query(DIVISION_EXISTS, [divisionId]);

        return rows.length > 0;
    }
}
