import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DivisionStandingRowDto } from '@tournament-hub/contracts';

type StandingRow = DivisionStandingRowDto;

const STANDINGS_OF_DIVISION = `
    SELECT  pl."id"                                              AS "id",
            pl."playerName"                                      AS "playerName",
            COALESCE(SUM(st."points"), 0)::int                    AS "points",
            COUNT(*) FILTER (WHERE r."songId" IS NOT NULL)::int   AS "songsPlayed"
    FROM        "standing" st
    JOIN        "round" r ON r."id" = st."roundId"
    JOIN        "match" m ON m."id" = r."matchId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    JOIN        "player" pl ON pl."id" = st."playerId"
    WHERE       ph."divisionId" = $1
    GROUP BY    pl."id", pl."playerName"
    ORDER BY    "points" DESC, "songsPlayed" DESC, LOWER(pl."playerName"), pl."id"
`;

@Injectable()
export class StandingsQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async forDivision(divisionId: number): Promise<DivisionStandingRowDto[]> {
        const rows: StandingRow[] = await this.dataSource.query(STANDINGS_OF_DIVISION, [divisionId]);

        return rows;
    }
}
