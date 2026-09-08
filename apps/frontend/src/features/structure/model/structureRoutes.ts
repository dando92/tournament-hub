import type { AdvancementRuleDto } from "@tournament-hub/contracts";
import type { Match } from "@/features/match/model/types";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";
import type { RoutableKind } from "@/features/structure/model/structureDraft";

export type NodeRoutes = {
    incoming: AdvancementRuleDto[];
    outgoing: AdvancementRuleDto[];
};

export function collectRoutes(division: TournamentDivisionOption | undefined, matches: Match[]): AdvancementRuleDto[] {
    const byIdentity = new Map<string, AdvancementRuleDto>();
    const carried = [
        ...(division?.phases ?? []).flatMap((phase) => (phase.phaseGroups ?? []).flatMap((pool) => pool.advancementRules ?? [])),
        ...matches.flatMap((match) => match.advancementRules ?? []),
    ];

    for (const rule of carried) {
        byIdentity.set(`${rule.targetKind}:${rule.targetId}:${rule.targetSlot}`, rule);
    }

    return [...byIdentity.values()];
}

export function routesOf(routes: AdvancementRuleDto[], kind: RoutableKind, id: number): NodeRoutes {
    const wanted = kind === "pool" ? "phase_group" : "match";

    return {
        incoming: routes.filter((rule) => rule.targetKind === wanted && rule.targetId === id).sort((left, right) => left.targetSlot - right.targetSlot),
        outgoing: routes
            .filter((rule) => rule.sourceKind === wanted && rule.sourceId === id)
            .sort((left, right) => left.sourcePlacement - right.sourcePlacement),
    };
}
