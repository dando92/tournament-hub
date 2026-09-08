import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DivisionPlacementsDto, PlayerStatsRowDto, SongStatsRowDto } from '@tournament-hub/contracts';
import type { AdvancementCompetitionKind, EntrantStatus, MatchResultEntryDto } from '@tournament-hub/contracts';

import { poolTotals } from '@tournament/structure/phase-group/pool-totals';
import { DivisionPlacementInput, PlacementCompetition, PlacementEntrant, resolveDivisionPlacements } from '@tournament/stats/division-placements.resolver';

const DIVISIONS_OF_TOURNAMENT = `
    SELECT      d."id" AS "divisionId", d."name" AS "divisionName"
    FROM        "division" d
    WHERE       d."tournamentId" = $1
    ORDER BY    d."id"
`;

const MATCHES_OF_DIVISIONS = `
    SELECT      ph."divisionId"                  AS "divisionId",
                m."id"                           AS "matchId",
                m."name"                         AS "name",
                m."phaseGroupId"                 AS "phaseGroupId",
                (m."matchResultId" IS NOT NULL)  AS "decided",
                mr."playerPoints"                AS "playerPoints"
    FROM        "match" m
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    LEFT JOIN   "match_result" mr ON mr."id" = m."matchResultId"
    WHERE       ph."divisionId" = ANY($1)
    ORDER BY    m."id"
`;

const POOLS_OF_DIVISIONS = `
    SELECT      ph."divisionId" AS "divisionId", pg."id" AS "phaseGroupId", pg."name" AS "name"
    FROM        "phase_group" pg
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    WHERE       ph."divisionId" = ANY($1)
    ORDER BY    pg."id"
`;

const MATCH_ENTRANTS_OF_DIVISIONS = `
    SELECT      ph."divisionId" AS "divisionId", mee."matchId" AS "matchId", mee."entrantId" AS "entrantId"
    FROM        "match_entrants_entrant" mee
    JOIN        "match" m ON m."id" = mee."matchId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    WHERE       ph."divisionId" = ANY($1)
`;

const POOL_SEATS_OF_DIVISIONS = `
    SELECT      ph."divisionId" AS "divisionId", pge."phaseGroupId" AS "phaseGroupId", pge."entrantId" AS "entrantId"
    FROM        "phase_group_entrant" pge
    JOIN        "phase_group" pg ON pg."id" = pge."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    WHERE       ph."divisionId" = ANY($1)
`;

const ADVANCEMENT_RULES_OF_DIVISIONS = `
    SELECT      ph."divisionId" AS "divisionId", ar."sourceKind", ar."sourceId", ar."targetKind", ar."targetId"
    FROM        "advancement_rule" ar
    JOIN        "match" m ON ar."sourceKind" = 'match' AND m."id" = ar."sourceId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    WHERE       ph."divisionId" = ANY($1)
    UNION ALL
    SELECT      ph."divisionId" AS "divisionId", ar."sourceKind", ar."sourceId", ar."targetKind", ar."targetId"
    FROM        "advancement_rule" ar
    JOIN        "phase_group" pg ON ar."sourceKind" = 'phase_group' AND pg."id" = ar."sourceId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    WHERE       ph."divisionId" = ANY($1)
`;

const ENTRANTS_OF_DIVISIONS = `
    SELECT      e."id" AS "entrantId", e."divisionId" AS "divisionId", e."name" AS "entrantName",
                e."status" AS "status", e."seedNum" AS "seedNum",
                pl."id" AS "playerId", pl."playerName" AS "playerName", pl."nationality" AS "nationality"
    FROM        "entrant" e
    LEFT JOIN   "entrant_participants_participant" ep ON ep."entrantId" = e."id"
    LEFT JOIN   "participant" p ON p."id" = ep."participantId"
    LEFT JOIN   "player" pl ON pl."id" = p."playerId"
    WHERE       e."divisionId" = ANY($1)
    ORDER BY    e."id", pl."id"
`;

const ENTRANT_TOTALS_OF_DIVISIONS = `
    SELECT      e."id"                                                    AS "entrantId",
                COALESCE(SUM(st."points"), 0)::int                         AS "points",
                COUNT(*) FILTER (WHERE r."songId" IS NOT NULL)::int         AS "songsPlayed",
                AVG(sc."percentage") FILTER (WHERE NOT sc."isFailed")       AS "averagePercentage"
    FROM        "entrant" e
    JOIN        "entrant_participants_participant" ep ON ep."entrantId" = e."id"
    JOIN        "participant" p ON p."id" = ep."participantId"
    JOIN        "standing" st ON st."playerId" = p."playerId"
    JOIN        "round" r ON r."id" = st."roundId"
    JOIN        "match" m ON m."id" = r."matchId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    LEFT JOIN   "score" sc ON sc."id" = st."scoreId"
    WHERE       e."divisionId" = ANY($1) AND ph."divisionId" = e."divisionId"
    GROUP BY    e."id"
`;

const SONGS_OF_TOURNAMENT = `
    SELECT      s."id"                                                      AS "songId",
                s."title"                                                   AS "title",
                s."artist"                                                  AS "artist",
                s."group"                                                   AS "group",
                s."difficulty"                                              AS "difficulty",
                COUNT(sc."id")::int                                          AS "playedCount",
                COUNT(DISTINCT sc."playerId")::int                           AS "playerCount",
                COUNT(sc."id") FILTER (WHERE sc."isFailed")::int             AS "failedCount",
                AVG(sc."percentage") FILTER (WHERE NOT sc."isFailed")        AS "averagePercentage",
                MAX(sc."percentage") FILTER (WHERE NOT sc."isFailed")        AS "bestPercentage",
                STDDEV_SAMP(sc."percentage") FILTER (WHERE NOT sc."isFailed") AS "percentageSpread",
                COUNT(sc."id") FILTER (WHERE sc."isFailed")::int                                        AS "failed",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 100)::int              AS "quad",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 96 AND sc."percentage" < 100)::int AS "star",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 89 AND sc."percentage" < 96)::int  AS "s",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 80 AND sc."percentage" < 89)::int  AS "a",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" < 80)::int                AS "b"
    FROM        "song" s
    JOIN        "round" r ON r."songId" = s."id"
    JOIN        "match" m ON m."id" = r."matchId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    JOIN        "division" d ON d."id" = ph."divisionId"
    JOIN        "standing" st ON st."roundId" = r."id"
    JOIN        "score" sc ON sc."id" = st."scoreId"
    WHERE       d."tournamentId" = $1
    GROUP BY    s."id"
    ORDER BY    "playedCount" DESC, LOWER(s."title"), s."id"
`;

const PLAYERS_OF_TOURNAMENT = `
    SELECT      pl."id"                                                     AS "playerId",
                pl."playerName"                                             AS "playerName",
                COALESCE(SUM(st."points"), 0)::int                           AS "points",
                COUNT(*) FILTER (WHERE r."songId" IS NOT NULL)::int          AS "songsPlayed",
                pl."nationality"                                            AS "nationality",
                COUNT(sc."id") FILTER (WHERE sc."isFailed")::int             AS "failedCount",
                AVG(sc."percentage") FILTER (WHERE NOT sc."isFailed")        AS "averagePercentage",
                MAX(sc."percentage") FILTER (WHERE NOT sc."isFailed")        AS "bestPercentage",
                STDDEV_SAMP(sc."percentage") FILTER (WHERE NOT sc."isFailed") AS "percentageSpread",
                COUNT(sc."id") FILTER (WHERE sc."isFailed")::int                                        AS "failed",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 100)::int              AS "quad",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 96 AND sc."percentage" < 100)::int AS "star",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 89 AND sc."percentage" < 96)::int  AS "s",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" >= 80 AND sc."percentage" < 89)::int  AS "a",
                COUNT(sc."id") FILTER (WHERE NOT sc."isFailed" AND sc."percentage" < 80)::int                AS "b"
    FROM        "standing" st
    JOIN        "round" r ON r."id" = st."roundId"
    JOIN        "match" m ON m."id" = r."matchId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    JOIN        "division" d ON d."id" = ph."divisionId"
    JOIN        "player" pl ON pl."id" = st."playerId"
    LEFT JOIN   "score" sc ON sc."id" = st."scoreId"
    WHERE       d."tournamentId" = $1
    GROUP BY    pl."id"
`;

const MATCH_RECORDS_OF_TOURNAMENT = `
    SELECT      (entry->>'playerId')::int                                       AS "playerId",
                COUNT(*)::int                                                   AS "matchesPlayed",
                COUNT(*) FILTER (WHERE (entry->>'placement')::int = 1)::int      AS "matchesWon"
    FROM        "match" m
    JOIN        "match_result" mr ON mr."id" = m."matchResultId"
    CROSS JOIN  LATERAL jsonb_array_elements(mr."playerPoints") AS entry
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    JOIN        "division" d ON d."id" = ph."divisionId"
    WHERE       d."tournamentId" = $1
    GROUP BY    1
`;

const BEST_RUNS_OF_TOURNAMENT = `
    SELECT DISTINCT ON (st."playerId")
                st."playerId"    AS "playerId",
                sc."percentage"  AS "percentage",
                s."title"        AS "songTitle"
    FROM        "standing" st
    JOIN        "score" sc ON sc."id" = st."scoreId" AND NOT sc."isFailed"
    JOIN        "song" s ON s."id" = sc."songId"
    JOIN        "round" r ON r."id" = st."roundId"
    JOIN        "match" m ON m."id" = r."matchId"
    JOIN        "phase_group" pg ON pg."id" = m."phaseGroupId"
    JOIN        "phase" ph ON ph."id" = pg."phaseId"
    JOIN        "division" d ON d."id" = ph."divisionId"
    WHERE       d."tournamentId" = $1
    ORDER BY    st."playerId", sc."percentage" DESC, s."id"
`;

type DivisionRow = { divisionId: number; divisionName: string };
type GradeMixRow = { quad: number; star: number; s: number; a: number; b: number; failed: number };
type MatchRow = { divisionId: number; matchId: number; name: string; phaseGroupId: number; decided: boolean; playerPoints: MatchResultEntryDto[] | null };
type PoolRow = { divisionId: number; phaseGroupId: number; name: string };
type MatchEntrantRow = { divisionId: number; matchId: number; entrantId: number };
type PoolSeatRow = { divisionId: number; phaseGroupId: number; entrantId: number };
type RuleRow = { divisionId: number; sourceKind: AdvancementCompetitionKind; sourceId: number; targetKind: AdvancementCompetitionKind; targetId: number };
type EntrantRow = {
    entrantId: number;
    divisionId: number;
    entrantName: string;
    status: EntrantStatus;
    seedNum: number | null;
    playerId: number | null;
    playerName: string | null;
    nationality: string | null;
};
type TotalsRow = { entrantId: number; points: number; songsPlayed: number; averagePercentage: string | null };
type SongRow = {
    songId: number;
    title: string;
    artist: string | null;
    group: string;
    difficulty: number;
    playedCount: number;
    playerCount: number;
    failedCount: number;
    averagePercentage: string | null;
    bestPercentage: string | null;
    percentageSpread: string | null;
} & GradeMixRow;
type PlayerRow = {
    playerId: number;
    playerName: string;
    nationality: string | null;
    points: number;
    songsPlayed: number;
    failedCount: number;
    averagePercentage: string | null;
    bestPercentage: string | null;
    percentageSpread: string | null;
} & GradeMixRow;
type MatchRecordRow = { playerId: number; matchesPlayed: number; matchesWon: number };
type BestRunRow = { playerId: number; percentage: string; songTitle: string };

function gradeMix(row: GradeMixRow) {
    return { quad: row.quad, star: row.star, s: row.s, a: row.a, b: row.b, failed: row.failed };
}

function decimal(value: string | null | undefined): number | null {
    return value === null || value === undefined ? null : Number(value);
}

@Injectable()
export class StatsQueries {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async placementsForTournament(tournamentId: number): Promise<DivisionPlacementsDto[]> {
        const divisions: DivisionRow[] = await this.dataSource.query(DIVISIONS_OF_TOURNAMENT, [tournamentId]);
        if (divisions.length === 0) {
            return [];
        }

        const ids = divisions.map((division) => division.divisionId);
        const [matches, pools, matchEntrants, poolSeats, rules, entrants, totals] = await Promise.all([
            this.dataSource.query(MATCHES_OF_DIVISIONS, [ids]) as Promise<MatchRow[]>,
            this.dataSource.query(POOLS_OF_DIVISIONS, [ids]) as Promise<PoolRow[]>,
            this.dataSource.query(MATCH_ENTRANTS_OF_DIVISIONS, [ids]) as Promise<MatchEntrantRow[]>,
            this.dataSource.query(POOL_SEATS_OF_DIVISIONS, [ids]) as Promise<PoolSeatRow[]>,
            this.dataSource.query(ADVANCEMENT_RULES_OF_DIVISIONS, [ids]) as Promise<RuleRow[]>,
            this.dataSource.query(ENTRANTS_OF_DIVISIONS, [ids]) as Promise<EntrantRow[]>,
            this.dataSource.query(ENTRANT_TOTALS_OF_DIVISIONS, [ids]) as Promise<TotalsRow[]>,
        ]);

        const totalsByEntrant = new Map(totals.map((row) => [row.entrantId, row]));

        return divisions.map((division) =>
            resolveDivisionPlacements(
                assembleDivision(division, totalsByEntrant, {
                    matches: matches.filter((row) => row.divisionId === division.divisionId),
                    pools: pools.filter((row) => row.divisionId === division.divisionId),
                    matchEntrants: matchEntrants.filter((row) => row.divisionId === division.divisionId),
                    poolSeats: poolSeats.filter((row) => row.divisionId === division.divisionId),
                    rules: rules.filter((row) => row.divisionId === division.divisionId),
                    entrants: entrants.filter((row) => row.divisionId === division.divisionId),
                }),
            ),
        );
    }

    async songsForTournament(tournamentId: number): Promise<SongStatsRowDto[]> {
        const rows: SongRow[] = await this.dataSource.query(SONGS_OF_TOURNAMENT, [tournamentId]);

        return rows.map((row) => ({
            songId: row.songId,
            title: row.title,
            artist: row.artist,
            group: row.group,
            difficulty: row.difficulty,
            playedCount: row.playedCount,
            playerCount: row.playerCount,
            failedCount: row.failedCount,
            averagePercentage: decimal(row.averagePercentage),
            bestPercentage: decimal(row.bestPercentage),
            percentageSpread: decimal(row.percentageSpread),
            grades: gradeMix(row),
        }));
    }

    async playersForTournament(tournamentId: number): Promise<PlayerStatsRowDto[]> {
        const [players, records, bestRuns] = await Promise.all([
            this.dataSource.query(PLAYERS_OF_TOURNAMENT, [tournamentId]) as Promise<PlayerRow[]>,
            this.dataSource.query(MATCH_RECORDS_OF_TOURNAMENT, [tournamentId]) as Promise<MatchRecordRow[]>,
            this.dataSource.query(BEST_RUNS_OF_TOURNAMENT, [tournamentId]) as Promise<BestRunRow[]>,
        ]);
        const recordsByPlayer = new Map(records.map((row) => [row.playerId, row]));
        const bestByPlayer = new Map(bestRuns.map((row) => [row.playerId, row]));

        return players
            .map((row) => ({
                playerId: row.playerId,
                playerName: row.playerName,
                nationality: row.nationality ?? '',
                points: row.points,
                songsPlayed: row.songsPlayed,
                failedCount: row.failedCount,
                averagePercentage: decimal(row.averagePercentage),
                bestPercentage: decimal(row.bestPercentage),
                bestSongTitle: bestByPlayer.get(row.playerId)?.songTitle ?? null,
                percentageSpread: decimal(row.percentageSpread),
                matchesPlayed: recordsByPlayer.get(row.playerId)?.matchesPlayed ?? 0,
                matchesWon: recordsByPlayer.get(row.playerId)?.matchesWon ?? 0,
                grades: gradeMix(row),
            }))
            .sort((left, right) => right.points - left.points || left.playerName.localeCompare(right.playerName) || left.playerId - right.playerId);
    }
}

type DivisionRows = {
    matches: MatchRow[];
    pools: PoolRow[];
    matchEntrants: MatchEntrantRow[];
    poolSeats: PoolSeatRow[];
    rules: RuleRow[];
    entrants: EntrantRow[];
};

function assembleDivision(division: DivisionRow, totals: Map<number, TotalsRow>, rows: DivisionRows): DivisionPlacementInput {
    const entrantByPlayer = new Map<number, number>();
    const seen = new Set<number>();
    const entrantRows: EntrantRow[] = [];

    for (const row of rows.entrants) {
        if (seen.has(row.entrantId)) {
            continue;
        }
        seen.add(row.entrantId);
        entrantRows.push(row);
        if (row.playerId !== null) {
            entrantByPlayer.set(row.playerId, row.entrantId);
        }
    }

    const entrantsOfMatch = new Map<number, number[]>();
    for (const row of rows.matchEntrants) {
        entrantsOfMatch.set(row.matchId, [...(entrantsOfMatch.get(row.matchId) ?? []), row.entrantId]);
    }

    const matchCompetitions: PlacementCompetition[] = rows.matches.map((row) => ({
        kind: 'match',
        id: row.matchId,
        name: row.name,
        phaseGroupId: row.phaseGroupId,
        decided: row.decided,
        entrantIds: entrantsOfMatch.get(row.matchId) ?? [],
        placements: (row.playerPoints ?? [])
            .map((entry) => ({ entrantId: entrantByPlayer.get(entry.playerId), placement: entry.placement }))
            .filter((entry): entry is { entrantId: number; placement: number } => entry.entrantId !== undefined),
    }));

    const pointsOfMatch = new Map(
        rows.matches.map((row) => [
            row.matchId,
            new Map((row.playerPoints ?? []).map((entry) => [entrantByPlayer.get(entry.playerId) ?? -1, entry.points])),
        ]),
    );

    const poolCompetitions: PlacementCompetition[] = rows.pools.map((pool) => {
        const own = matchCompetitions.filter((match) => match.phaseGroupId === pool.phaseGroupId);
        const seated = rows.poolSeats.filter((seat) => seat.phaseGroupId === pool.phaseGroupId).map((seat) => seat.entrantId);
        const totalsOfPool = poolTotals(
            own.map((match) => match.entrantIds.map((entrantId) => ({ entrantId, points: pointsOfMatch.get(match.id)?.get(entrantId) ?? 0 }))),
        );

        return {
            kind: 'phase_group',
            id: pool.phaseGroupId,
            name: pool.name,
            phaseGroupId: null,
            decided: own.length > 0 && own.every((match) => match.decided),
            entrantIds: [...new Set([...own.flatMap((match) => match.entrantIds), ...seated])],
            placements: sharePlacementsOnEqualPoints(totalsOfPool),
        };
    });

    const played = new Set(rows.matchEntrants.map((row) => row.entrantId));
    const entrants: PlacementEntrant[] = entrantRows
        .filter((row) => played.has(row.entrantId))
        .map((row) => {
            const total = totals.get(row.entrantId);

            return {
                entrantId: row.entrantId,
                entrantName: row.entrantName,
                playerId: row.playerId,
                playerName: row.playerName,
                status: row.status,
                nationality: row.nationality ?? '',
                seedNum: row.seedNum,
                points: total?.points ?? 0,
                songsPlayed: total?.songsPlayed ?? 0,
                averagePercentage: total?.averagePercentage === null || total?.averagePercentage === undefined ? null : Number(total.averagePercentage),
            };
        });

    return {
        divisionId: division.divisionId,
        divisionName: division.divisionName,
        competitions: [...matchCompetitions, ...poolCompetitions],
        edges: rows.rules.map((rule) => ({
            sourceKind: rule.sourceKind,
            sourceId: rule.sourceId,
            targetKind: rule.targetKind,
            targetId: rule.targetId,
        })),
        entrants,
    };
}

function sharePlacementsOnEqualPoints(totals: Array<{ entrantId: number; points: number }>): Array<{ entrantId: number; placement: number }> {
    const placements: Array<{ entrantId: number; placement: number }> = [];
    let index = 0;

    while (index < totals.length) {
        let end = index + 1;
        while (end < totals.length && totals[end].points === totals[index].points) {
            end += 1;
        }
        for (const total of totals.slice(index, end)) {
            placements.push({ entrantId: total.entrantId, placement: index + 1 });
        }
        index = end;
    }

    return placements;
}
