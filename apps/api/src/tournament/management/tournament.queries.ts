import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tournament } from '@tournament-hub/persistence';
import {
    MyTournamentRolesDto,
    TournamentConfigurationDto,
    TournamentDto,
    TournamentRefDto,
} from '@tournament-hub/contracts';

type TournamentRolesRow = {
    ownedTournamentIds: number[];
    staffTournamentIds: number[];
};

const TOURNAMENT_ROLES_OF_ACCOUNT = `
    WITH membership AS (
        SELECT DISTINCT
                pa."tournamentId" AS "tournamentId",
                pa."roles"        AS "roles"
        FROM        "participant" pa
        LEFT JOIN   "account" acc ON acc."playerId" = pa."playerId"
        WHERE       pa."tournamentId" IS NOT NULL
            AND     (pa."accountId" = $1 OR acc."id" = $1)
    )
    SELECT  COALESCE(json_agg(DISTINCT "tournamentId") FILTER (WHERE 'owner' = ANY("roles")), '[]'::json) AS "ownedTournamentIds",
            COALESCE(json_agg(DISTINCT "tournamentId") FILTER (WHERE 'staff' = ANY("roles")), '[]'::json) AS "staffTournamentIds"
    FROM    membership
`;

@Injectable()
export class TournamentQueries {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly config: ConfigService,
    ) {}

    async byId(id: number): Promise<TournamentDto | null> {
        const tournament = await this.tournamentRepository.findOne({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                closedAt: true,
                defaultScoringSystem: true,
            },
        });
        if (!tournament) return null;

        return {
            id: tournament.id,
            name: tournament.name,
            status: tournament.status,
            closedAt: tournament.closedAt?.toISOString() ?? null,
            defaultScoringSystem: tournament.defaultScoringSystem,
        };
    }

    async configuration(id: number): Promise<TournamentConfigurationDto | null> {
        const tournament = await this.tournamentRepository.findOne({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                closedAt: true,
                startggApiKey: true,
                defaultScoringSystem: true,
                controlRoomKeyHash: true,
                controlRoomKeyIssuedAt: true,
                controlRoomKeyLastUsedAt: true,
            },
        });
        if (!tournament) return null;

        return {
            id: tournament.id,
            name: tournament.name,
            status: tournament.status,
            closedAt: tournament.closedAt?.toISOString() ?? null,
            transportRetentionDays: Number(this.config.get('TOURNAMENT_TRANSPORT_RETENTION_DAYS') ?? 10),
            startggApiKey: tournament.startggApiKey,
            defaultScoringSystem: tournament.defaultScoringSystem,
            controlRoomKey: {
                hasKey: Boolean(tournament.controlRoomKeyHash),
                issuedAt: tournament.controlRoomKeyIssuedAt?.toISOString() ?? null,
                lastUsedAt: tournament.controlRoomKeyLastUsedAt?.toISOString() ?? null,
            },
        };
    }

    async publicList(): Promise<TournamentRefDto[]> {
        const tournaments = await this.tournamentRepository.find({
            select: { id: true, name: true },
            order: { id: 'ASC' },
        });

        return tournaments.map((tournament) => ({ id: tournament.id, name: tournament.name }));
    }

    async hasStartggApiKey(id: number): Promise<boolean | null> {
        const tournament = await this.tournamentRepository.findOne({
            where: { id },
            select: { id: true, startggApiKey: true },
        });
        if (!tournament) return null;

        return Boolean(tournament.startggApiKey?.trim());
    }

    async rolesFor(accountId: string): Promise<Pick<MyTournamentRolesDto, 'ownedTournamentIds' | 'staffTournamentIds'>> {
        const [row]: TournamentRolesRow[] = await this.dataSource.query(TOURNAMENT_ROLES_OF_ACCOUNT, [accountId]);

        return {
            ownedTournamentIds: row?.ownedTournamentIds ?? [],
            staffTournamentIds: row?.staffTournamentIds ?? [],
        };
    }
}
