import { EntityManager } from 'typeorm';

const INVARIANTS = `
    WITH match_players AS (
        SELECT DISTINCT me."matchId" AS "matchId", pa."playerId" AS "playerId", ca."tournamentId" AS "tournamentId"
        FROM   "match_entrants_entrant" me
        JOIN   "entrant" e ON e."id" = me."entrantId" AND e."type" = 'player'
        JOIN   "entrant_participants_participant" ep ON ep."entrantId" = e."id"
        JOIN   "participant" pa ON pa."id" = ep."participantId"
        JOIN   "competition_address" ca ON ca."matchId" = me."matchId"
    ),
    unsettled AS (
        SELECT DISTINCT r."matchId" AS "matchId"
        FROM   "round" r
        WHERE  (
                   r."songId" IS NOT NULL
                   AND EXISTS (
                       SELECT 1
                       FROM   match_players mp
                       WHERE  mp."matchId" = r."matchId"
                          AND NOT EXISTS (SELECT 1 FROM "standing" s WHERE s."roundId" = r."id" AND s."playerId" = mp."playerId")
                   )
               )
            OR (
                   r."songId" IS NULL
                   AND NOT EXISTS (SELECT 1 FROM "standing" s WHERE s."roundId" = r."id" AND s."points" > 0)
               )
    ),
    evidence AS (
        SELECT DISTINCT r."matchId" AS "matchId"
        FROM   "round" r
        JOIN   "standing" s ON s."roundId" = r."id"
        WHERE  s."scoreId" IS NOT NULL OR s."points" > 0
    ),
    match_totals AS (
        SELECT   r."matchId" AS "matchId", s."playerId" AS "playerId", SUM(s."points") AS "points"
        FROM     "round" r
        JOIN     "standing" s ON s."roundId" = r."id"
        GROUP BY r."matchId", s."playerId"
    ),
    tied AS (
        SELECT DISTINCT "matchId"
        FROM   (SELECT "matchId", "points", COUNT(*) AS "sharing" FROM match_totals GROUP BY "matchId", "points") grouped
        WHERE  "sharing" > 1
    ),
    settled AS (
        SELECT m."id" AS "id"
        FROM   "match" m
        WHERE  EXISTS (SELECT 1 FROM "round" r WHERE r."matchId" = m."id")
           AND EXISTS (SELECT 1 FROM match_players mp WHERE mp."matchId" = m."id")
           AND NOT EXISTS (SELECT 1 FROM unsettled u WHERE u."matchId" = m."id")
    )
    SELECT
        (SELECT COUNT(*) FROM "match" m WHERE (m."state" = 'completed') <> (m."matchResultId" IS NOT NULL))                        AS "completedWithoutResult",
        (SELECT COUNT(*) FROM "match" m WHERE m."state" = 'open' AND EXISTS (SELECT 1 FROM evidence e WHERE e."matchId" = m."id")) AS "openWithEvidence",
        (SELECT COUNT(*) FROM "match" m
          WHERE m."state" IN ('partial', 'ready', 'tiebreak_required')
            AND NOT EXISTS (SELECT 1 FROM evidence e WHERE e."matchId" = m."id"))                                                  AS "progressedWithoutEvidence",
        (SELECT COUNT(*) FROM "match" m
          WHERE m."state" IN ('ready', 'tiebreak_required')
            AND NOT EXISTS (SELECT 1 FROM settled s WHERE s."id" = m."id"))                                                        AS "readyButUnsettled",
        (SELECT COUNT(*) FROM "match" m
          WHERE m."state" = 'partial' AND EXISTS (SELECT 1 FROM settled s WHERE s."id" = m."id"))                                  AS "partialButSettled",
        (SELECT COUNT(*) FROM "match" m
          WHERE m."state" = 'tiebreak_required'
            AND NOT EXISTS (SELECT 1 FROM "advancement_rule" ar WHERE ar."sourceKind" = 'match' AND ar."sourceId" = m."id"))       AS "tiebreakWithoutRule",
        (SELECT COUNT(*) FROM "match" m
          WHERE m."state" = 'tiebreak_required' AND NOT EXISTS (SELECT 1 FROM tied t WHERE t."matchId" = m."id"))                   AS "tiebreakWithoutTie",
        (SELECT COUNT(*) FROM "match" m
          WHERE m."state" = 'ready' AND EXISTS (SELECT 1 FROM tied t WHERE t."matchId" = m."id"))                                   AS "readyButTied",
        (SELECT COUNT(*) FROM (
            SELECT mp."tournamentId", mp."playerId"
            FROM   match_players mp
            JOIN   "match" m ON m."id" = mp."matchId" AND m."active" = TRUE
            GROUP  BY mp."tournamentId", mp."playerId"
            HAVING COUNT(*) > 1
         ) conflicting)                                                                                                            AS "playersOnTwoCabinets",
        (SELECT COUNT(*) FROM "schedule" s WHERE s."status" = 'running' AND s."currentEntryId" IS NULL)                             AS "runningWithoutCurrentEntry"
`;

const STATE_COUNTS = `
    SELECT   m."state" AS "state", COUNT(*)::int AS "count"
    FROM     "match" m
    GROUP BY m."state"
    ORDER BY m."state"
`;

export type Verification = {
    failures: Array<{ invariant: string; offending: number }>;
    states: Array<{ state: string; count: number }>;
};

export async function verifyDataset(manager: EntityManager): Promise<Verification> {
    const [counts] = await manager.query(INVARIANTS);
    const states = await manager.query(STATE_COUNTS);

    return {
        failures: Object.entries(counts)
            .map(([invariant, offending]) => ({ invariant, offending: Number(offending) }))
            .filter(({ offending }) => offending > 0),
        states: states.map((row: { state: string; count: number }) => ({ state: row.state, count: Number(row.count) })),
    };
}
