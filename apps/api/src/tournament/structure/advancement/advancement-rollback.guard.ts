import { ConflictException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AdvancementRule, Entrant } from "@tournament-hub/persistence";

import { MatchAggregate } from "@match/match.aggregate";
import { PhaseGroupStore } from "@tournament/structure/phase-group/phase-group.store";
import { AdvancementRuleStore } from "./advancement-rule.store";

type Impact = { rule: AdvancementRule; entrant: Entrant };
type BlockingTarget = {
    kind: "match" | "phase_group";
    id: number;
    name: string;
    reason: "RESULT_COMMITTED" | "SCORES_RECORDED";
    blockingMatchId?: number;
    blockingMatchName?: string;
};

type ProgressedPoolRow = {
    targetId: number;
    targetName: string;
    blockingMatchId: number;
    blockingMatchName: string;
    reason: "RESULT_COMMITTED" | "SCORES_RECORDED";
};

type ProgressedMatchRow = {
    targetId: number;
    targetName: string;
    reason: "RESULT_COMMITTED" | "SCORES_RECORDED";
};

type SeatedPoolRow = { phaseGroupId: number };

const PROGRESSED_MATCHES = `
    WITH impact("matchId", "entrantId") AS (
        SELECT * FROM unnest($1::int[], $2::int[])
    )
    SELECT DISTINCT
             m."id" AS "targetId",
             m."name" AS "targetName",
             CASE WHEN m."state" = 'completed' THEN 'RESULT_COMMITTED' ELSE 'SCORES_RECORDED' END AS "reason"
    FROM     "match" m
    JOIN     impact i ON i."matchId" = m."id"
    JOIN     "match_entrants_entrant" me ON me."matchId" = m."id" AND me."entrantId" = i."entrantId"
    WHERE    m."state" <> 'open'
    ORDER BY m."id"
`;

const SEATS_TAKEN_BY_RULES = `
    SELECT DISTINCT seat."phaseGroupId" AS "phaseGroupId"
    FROM   "phase_group_entrant" seat
    WHERE  seat."phaseGroupId" = ANY($1::int[])
        AND seat."sourceAdvancementRuleId" = ANY($2::int[])
`;

const PROGRESSED_POOLS = `
    SELECT   pg."id" AS "targetId",
             pg."name" AS "targetName",
             m."id" AS "blockingMatchId",
             m."name" AS "blockingMatchName",
             CASE WHEN m."state" = 'completed' THEN 'RESULT_COMMITTED' ELSE 'SCORES_RECORDED' END AS "reason"
    FROM     "phase_group" pg
    JOIN     "match" m ON m."phaseGroupId" = pg."id"
    WHERE    pg."id" = ANY($1::int[])
        AND  m."state" <> 'open'
    ORDER BY pg."id", m."id"
`;

@Injectable()
export class AdvancementRollbackGuard {
    constructor(
        private readonly dataSource: DataSource,
        private readonly rules: AdvancementRuleStore,
        private readonly phaseGroups: PhaseGroupStore,
    ) {}

    async assertMatchCanReopen(source: MatchAggregate): Promise<void> {
        const impacts = await this.impactsOf(source);
        const blockers = [...(await this.blockingMatches(impacts)), ...(await this.blockingPhaseGroups(impacts))];
        if (blockers.length === 0) {
            return;
        }

        throw new ConflictException({
            code: "ADVANCEMENT_ROLLBACK_BLOCKED_BY_TARGET_PROGRESS",
            message: "The result cannot be reopened because an affected advancement target already has scores or a committed result",
            sourceMatchId: source.id,
            blockingTargets: blockers,
        });
    }

    private async impactsOf(source: MatchAggregate): Promise<Impact[]> {
        const impacts = await this.impactsFromRules("match", source.id, source.entrantsByPlacement());
        const phaseGroup = await this.phaseGroups.load(source.phaseGroupId);
        if (phaseGroup?.entity.state === "completed") {
            impacts.push(...(await this.impactsFromRules("phase_group", phaseGroup.id, phaseGroup.placements)));
        }

        return impacts;
    }

    private async impactsFromRules(sourceKind: "match" | "phase_group", sourceId: number, placements: Entrant[]): Promise<Impact[]> {
        const rules = await this.rules.findBySource(sourceKind, sourceId);

        return rules.map((rule) => ({ rule, entrant: placements[rule.sourcePlacement - 1] })).filter((impact): impact is Impact => Boolean(impact.entrant));
    }

    private async blockingMatches(impacts: Impact[]): Promise<BlockingTarget[]> {
        const targeted = impacts.filter((impact) => impact.rule.targetKind === "match");
        if (targeted.length === 0) {
            return [];
        }

        const rows: ProgressedMatchRow[] = await this.dataSource.query(PROGRESSED_MATCHES, [
            targeted.map((impact) => impact.rule.targetId),
            targeted.map((impact) => impact.entrant.id),
        ]);

        return rows.map((row) => ({ kind: "match", id: row.targetId, name: row.targetName, reason: row.reason }));
    }

    private async blockingPhaseGroups(impacts: Impact[]): Promise<BlockingTarget[]> {
        const targeted = impacts.filter((impact) => impact.rule.targetKind === "phase_group");
        if (targeted.length === 0) {
            return [];
        }

        const seated: SeatedPoolRow[] = await this.dataSource.query(SEATS_TAKEN_BY_RULES, [
            targeted.map((impact) => impact.rule.targetId),
            targeted.map((impact) => impact.rule.id),
        ]);
        if (seated.length === 0) {
            return [];
        }

        const rows: ProgressedPoolRow[] = await this.dataSource.query(PROGRESSED_POOLS, [seated.map((row) => row.phaseGroupId)]);

        return rows.map((row) => ({
            kind: "phase_group",
            id: row.targetId,
            name: row.targetName,
            reason: row.reason,
            blockingMatchId: row.blockingMatchId,
            blockingMatchName: row.blockingMatchName,
        }));
    }
}
