import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PhaseGroupEntrantDto } from '@tournament-hub/contracts';

import { PhaseGroupAddress } from '@tournament/structure/phase-group/phase-group.aggregate';

type PhaseGroupEntrantRow = PhaseGroupEntrantDto;

const ENTRANTS_OF_PHASE_GROUP = `
    SELECT  member."seedNum"        AS "seedNum",
            member."slot"           AS "slot",
            member."status"         AS "status",
            json_build_object(
                'id', member."entrantId",
                'name', member."name",
                'type', member."type",
                'status', member."entrantStatus",
                'participants', COALESCE(participants."json", '[]'::json)
            )                       AS "entrant"
    FROM (
        SELECT  seat."seedNum"      AS "seedNum",
                seat."slot"         AS "slot",
                seat."status"       AS "status",
                e."id"              AS "entrantId",
                e."name"            AS "name",
                e."type"            AS "type",
                e."status"          AS "entrantStatus",
                e."seedNum"         AS "divisionSeedNum"
        FROM    "phase_group_entrant" seat
        JOIN    "entrant" e ON e."id" = seat."entrantId"
        WHERE   seat."phaseGroupId" = $1

        UNION ALL

        SELECT  DISTINCT
                NULL::int           AS "seedNum",
                NULL::int           AS "slot",
                'active'            AS "status",
                e."id"              AS "entrantId",
                e."name"            AS "name",
                e."type"            AS "type",
                e."status"          AS "entrantStatus",
                e."seedNum"         AS "divisionSeedNum"
        FROM    "match" m
        JOIN    "match_entrants_entrant" me ON me."matchId" = m."id"
        JOIN    "entrant" e ON e."id" = me."entrantId"
        WHERE   m."phaseGroupId" = $1
            AND NOT EXISTS (
                SELECT  1
                FROM    "phase_group_entrant" seat
                WHERE   seat."entrantId" = e."id" AND seat."phaseGroupId" = $1
            )
    ) member
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
        WHERE   ep."entrantId" = member."entrantId"
    ) participants ON TRUE
    ORDER BY member."seedNum" ASC NULLS LAST, member."divisionSeedNum" ASC NULLS LAST, LOWER(member."name"), member."entrantId"
`;

type PhaseGroupAddressRow = PhaseGroupAddress;

const ADDRESS_OF_PHASE_GROUP = `
    SELECT  ca."tournamentId" AS "tournamentId",
            ca."divisionId"   AS "divisionId",
            ca."phaseId"      AS "phaseId",
            ca."phaseGroupId" AS "phaseGroupId"
    FROM    "competition_address" ca
    WHERE   ca."phaseGroupId" = $1
    LIMIT   1
`;

const ADDRESS_OF_MATCH_POOL = `
    SELECT  ca."tournamentId" AS "tournamentId",
            ca."divisionId"   AS "divisionId",
            ca."phaseId"      AS "phaseId",
            ca."phaseGroupId" AS "phaseGroupId"
    FROM    "competition_address" ca
    WHERE   ca."matchId" = $1
`;

const PHASE_GROUP_EXISTS = `
    SELECT  1
    FROM    "phase_group" pg
    WHERE   pg."id" = $1
`;

const DEFAULT_PHASE_GROUP_OF_PHASE = `
    SELECT   pg."id" AS "id"
    FROM     "phase_group" pg
    WHERE    pg."phaseId" = $1
    ORDER BY pg."id" ASC
    LIMIT    1
`;

@Injectable()
export class PhaseGroupQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async entrants(phaseGroupId: number): Promise<PhaseGroupEntrantDto[]> {
        const rows: PhaseGroupEntrantRow[] = await this.dataSource.query(ENTRANTS_OF_PHASE_GROUP, [phaseGroupId]);

        return rows;
    }

    async address(phaseGroupId: number): Promise<PhaseGroupAddress | null> {
        const rows: PhaseGroupAddressRow[] = await this.dataSource.query(ADDRESS_OF_PHASE_GROUP, [phaseGroupId]);

        return rows[0] ?? null;
    }

    async addressOfMatchPool(matchId: number): Promise<PhaseGroupAddress | null> {
        const rows: PhaseGroupAddressRow[] = await this.dataSource.query(ADDRESS_OF_MATCH_POOL, [matchId]);

        return rows[0] ?? null;
    }

    async exists(phaseGroupId: number): Promise<boolean> {
        const rows: unknown[] = await this.dataSource.query(PHASE_GROUP_EXISTS, [phaseGroupId]);

        return rows.length > 0;
    }

    async defaultForPhase(phaseId: number): Promise<number | null> {
        const rows: Array<{ id: number }> = await this.dataSource.query(DEFAULT_PHASE_GROUP_OF_PHASE, [phaseId]);

        return rows[0]?.id ?? null;
    }
}
