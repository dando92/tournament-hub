import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ParticipantDto, ParticipantImportPreviewRowDto, PlayerRefDto } from '@tournament-hub/contracts';

type ParticipantRow = ParticipantDto;

const PARTICIPANTS_OF_TOURNAMENT = `
    SELECT  pa."id"     AS "id",
            to_json(pa."roles") AS "roles",
            pa."status" AS "status",
            json_build_object('id', pl."id", 'playerName', pl."playerName", 'nationality', pl."nationality") AS "player"
    FROM    "participant" pa
    JOIN    "player" pl ON pl."id" = pa."playerId"
    WHERE   pa."tournamentId" = $1
    ORDER BY LOWER(pl."playerName"), pa."id"
`;

type ImportPreviewRow = {
    name: string;
    playerId: number | null;
    playerName: string | null;
    nationality: string | null;
    alreadyParticipant: boolean;
};

const IMPORT_PREVIEW_OF_NAMES = `
    WITH requested AS (
        SELECT  "name", "ordinality"
        FROM    unnest($2::text[]) WITH ORDINALITY AS t("name", "ordinality")
    )
    SELECT  r."name"             AS "name",
            matched."id"         AS "playerId",
            matched."playerName" AS "playerName",
            matched."nationality" AS "nationality",
            EXISTS (
                SELECT  1
                FROM    "participant" pa
                WHERE   pa."tournamentId" = $1 AND pa."playerId" = matched."id"
            )                    AS "alreadyParticipant"
    FROM        requested r
    LEFT JOIN   "player" matched ON LOWER(TRIM(matched."playerName")) = LOWER(TRIM(r."name"))
    ORDER BY r."ordinality"
`;

type DivisionRow = { divisionId: number };

const DIVISIONS_OF_PARTICIPANT = `
    SELECT DISTINCT d."id" AS "divisionId"
    FROM    "entrant_participants_participant" ep
    JOIN    "entrant" e ON e."id" = ep."entrantId"
    JOIN    "division" d ON d."id" = e."divisionId"
    WHERE   ep."participantId" = $2 AND d."tournamentId" = $1
    ORDER BY d."id"
`;

const PARTICIPANT_CAN_EDIT = `
    SELECT  1
    FROM    "participant" pa
    WHERE   pa."tournamentId" = $1
        AND pa."accountId" = $2
        AND pa."roles" && ARRAY['owner', 'staff']
    LIMIT   1
`;

@Injectable()
export class ParticipantQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async forTournament(tournamentId: number): Promise<ParticipantDto[]> {
        const rows: ParticipantRow[] = await this.dataSource.query(PARTICIPANTS_OF_TOURNAMENT, [tournamentId]);

        return rows;
    }

    async divisionsOf(tournamentId: number, participantId: number): Promise<number[]> {
        const rows: DivisionRow[] = await this.dataSource.query(DIVISIONS_OF_PARTICIPANT, [tournamentId, participantId]);

        return rows.map((row) => row.divisionId);
    }

    async canEdit(tournamentId: number, accountId: string): Promise<boolean> {
        const rows: unknown[] = await this.dataSource.query(PARTICIPANT_CAN_EDIT, [tournamentId, accountId]);

        return rows.length > 0;
    }

    async importPreview(tournamentId: number, playerNames: string[]): Promise<ParticipantImportPreviewRowDto[]> {
        const requested = [...new Set(playerNames.map((name) => name.trim()).filter(Boolean))];
        if (requested.length === 0) return [];

        const rows: ImportPreviewRow[] = await this.dataSource.query(IMPORT_PREVIEW_OF_NAMES, [tournamentId, requested]);

        return rows.map((row) => ({
            name: row.name,
            matchedPlayer: this.toPlayerRef(row),
            alreadyParticipant: row.alreadyParticipant,
        }));
    }

    private toPlayerRef(row: ImportPreviewRow): PlayerRefDto | null {
        if (row.playerId === null || row.playerName === null) return null;

        return { id: row.playerId, playerName: row.playerName, nationality: row.nationality ?? '' };
    }
}
