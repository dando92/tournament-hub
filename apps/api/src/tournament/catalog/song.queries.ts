import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SongDto } from '@tournament-hub/contracts';

type SongRow = SongDto;

const SONGS_OF_TOURNAMENT = `
    SELECT  s."id"              AS "id",
            s."title"           AS "title",
            s."artist"          AS "artist",
            s."difficulty"      AS "difficulty",
            s."chartDifficulty" AS "chartDifficulty",
            s."group"           AS "group"
    FROM     "song" s
    WHERE    s."tournamentId" = $1
    ORDER BY s."group", s."difficulty", LOWER(s."title"), s."id"
`;

export type RollScope = {
    allowPlayed?: boolean;
    matchId?: number | null;
};

const ROLLABLE_SONGS = `
    SELECT  s."id"              AS "id",
            s."title"           AS "title",
            s."artist"          AS "artist",
            s."difficulty"      AS "difficulty",
            s."chartDifficulty" AS "chartDifficulty",
            s."group"           AS "group"
    FROM    "song" s
    WHERE   s."tournamentId" = $1
        AND ($3::text IS NULL OR s."group" = $3)
        AND ($4::boolean OR NOT EXISTS (
            SELECT  1
            FROM    "round" r
            JOIN    "match" m        ON m."id"  = r."matchId"
            JOIN    "phase_group" pg ON pg."id" = m."phaseGroupId"
            JOIN    "phase" p        ON p."id"  = pg."phaseId"
            WHERE   p."divisionId" = $2 AND r."songId" = s."id"
        ))
        AND NOT EXISTS (
            SELECT  1
            FROM    "round" r
            WHERE   r."matchId" = $5::int AND r."songId" = s."id"
        )
    ORDER BY s."id"
`;

@Injectable()
export class SongQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async forTournament(tournamentId: number): Promise<SongDto[]> {
        const rows: SongRow[] = await this.dataSource.query(SONGS_OF_TOURNAMENT, [tournamentId]);

        return rows;
    }

    async rollable(tournamentId: number, divisionId: number, group: string | null, scope: RollScope = {}): Promise<SongDto[]> {
        const parameters = [tournamentId, divisionId, group ?? null, scope.allowPlayed ?? false, scope.matchId ?? null];

        return await this.dataSource.query(ROLLABLE_SONGS, parameters);
    }
}
