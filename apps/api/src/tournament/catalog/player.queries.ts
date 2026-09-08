import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PlayerRefDto } from '@tournament-hub/contracts';

type PlayerRow = PlayerRefDto;

const ALL_PLAYERS = `
    SELECT   pl."id"          AS "id",
             pl."playerName"  AS "playerName",
             pl."nationality" AS "nationality"
    FROM     "player" pl
    ORDER BY LOWER(pl."playerName"), pl."id"
`;

@Injectable()
export class PlayerQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async all(): Promise<PlayerRefDto[]> {
        const rows: PlayerRow[] = await this.dataSource.query(ALL_PLAYERS);

        return rows;
    }
}
