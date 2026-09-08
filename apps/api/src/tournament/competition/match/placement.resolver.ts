import type { AdvancementRuleDto, MatchPlacementTieDto, MatchResultEntryDto } from "@tournament-hub/contracts";

export type AdvancementRouting = Pick<AdvancementRuleDto, "sourceKind" | "sourceId" | "sourcePlacement" | "targetKind" | "targetId" | "targetSlot">;

export type TiebreakPlacementInput = {
    id: number;
    sequence: number;
    invalidated: boolean;
    complete: boolean;
    entries: Array<{
        playerId: number;
        value: number | null;
        isFailed: boolean | null;
    }>;
};

export type PlacementPointEntry = {
    playerId: number;
    points: number;
    averagePercentage?: number | null;
};

export type PlacementResolution = {
    entries: MatchResultEntryDto[];
    ambiguousTies: MatchPlacementTieDto[];
};

type PlacementGroup = MatchResultEntryDto[];

export function resolvePlacements(
    pointEntries: PlacementPointEntry[],
    tiebreaks: TiebreakPlacementInput[],
    advancementRules: AdvancementRouting[],
): PlacementResolution {
    const averages = new Map(pointEntries.map((entry) => [entry.playerId, entry.averagePercentage ?? null]));
    let groups = pointGroups(pointEntries);

    for (const tiebreak of [...tiebreaks].sort((left, right) => left.sequence - right.sequence || left.id - right.id)) {
        if (tiebreak.invalidated || !tiebreak.complete) continue;

        const groupIndex = groups.findIndex((group) => samePlayers(group, tiebreak.entries));
        if (groupIndex < 0) continue;

        groups = [
            ...groups.slice(0, groupIndex),
            ...splitGroup(groups[groupIndex], tiebreak),
            ...groups.slice(groupIndex + 1),
        ];
    }

    return materialize(groups, advancementRules, averages);
}

function pointGroups(entries: PlacementPointEntry[]): PlacementGroup[] {
    const ordered = [...entries].sort((left, right) => right.points - left.points || left.playerId - right.playerId);
    const groups: PlacementGroup[] = [];

    for (const entry of ordered) {
        const last = groups.at(-1);
        const placed = { playerId: entry.playerId, points: entry.points, placement: 0 };
        if (last?.[0]?.points === entry.points) {
            last.push(placed);
        } else {
            groups.push([placed]);
        }
    }

    return groups;
}

function samePlayers(group: PlacementGroup, entries: TiebreakPlacementInput["entries"]): boolean {
    if (group.length !== entries.length) return false;

    const players = new Set(group.map((entry) => entry.playerId));
    return entries.every((entry) => players.has(entry.playerId));
}

function splitGroup(group: PlacementGroup, tiebreak: TiebreakPlacementInput): PlacementGroup[] {
    const values = new Map(tiebreak.entries.map((entry) => [entry.playerId, entry]));
    const ordered = [...group].sort((left, right) => compareEvidence(values.get(left.playerId), values.get(right.playerId)) || left.playerId - right.playerId);
    const groups: PlacementGroup[] = [];

    for (const entry of ordered) {
        const last = groups.at(-1);
        const previous = last ? values.get(last[0].playerId) : null;
        const current = values.get(entry.playerId);
        if (last && compareEvidence(previous, current) === 0) last.push(entry);
        else groups.push([entry]);
    }

    return groups;
}

function compareEvidence(
    left: TiebreakPlacementInput["entries"][number] | null | undefined,
    right: TiebreakPlacementInput["entries"][number] | null | undefined,
): number {
    const leftFailed = left?.isFailed === true ? 1 : 0;
    const rightFailed = right?.isFailed === true ? 1 : 0;
    if (leftFailed !== rightFailed) return leftFailed - rightFailed;

    return Number(right?.value ?? 0) - Number(left?.value ?? 0);
}

function materialize(groups: PlacementGroup[], rules: AdvancementRouting[], averages: Map<number, number | null>): PlacementResolution {
    const outgoing = rules.filter((rule) => rule.sourceKind === "match");
    const ruleByPlacement = new Map(outgoing.map((rule) => [rule.sourcePlacement, rule]));
    const entries: MatchResultEntryDto[] = [];
    const ambiguousTies: MatchPlacementTieDto[] = [];
    let offset = 0;

    for (const group of groups) {
        const placement = offset + 1;

        if (separatesOutcomes(group, placement, ruleByPlacement)) {
            entries.push(...byPlayerId(group).map((entry) => ({ ...entry, placement })));
            ambiguousTies.push({
                playerIds: byPlayerId(group).map((entry) => entry.playerId),
                fromPlacement: placement,
                toPlacement: placement + group.length - 1,
            });
        } else {
            let settled = placement;
            for (const separated of splitByAverage(group, averages)) {
                entries.push(...byPlayerId(separated).map((entry) => ({ ...entry, placement: settled })));
                settled += separated.length;
            }
        }

        offset += group.length;
    }

    return { entries, ambiguousTies };
}

function separatesOutcomes(group: PlacementGroup, placement: number, ruleByPlacement: Map<number, AdvancementRouting>): boolean {
    if (group.length < 2) {
        return false;
    }

    return new Set(group.map((_, index) => outcomeOf(ruleByPlacement.get(placement + index)))).size > 1;
}

function splitByAverage(group: PlacementGroup, averages: Map<number, number | null>): PlacementGroup[] {
    if (group.length < 2 || group.some((entry) => averages.get(entry.playerId) === null || averages.get(entry.playerId) === undefined)) {
        return [group];
    }

    const average = (entry: MatchResultEntryDto) => comparableAverage(averages.get(entry.playerId) ?? 0);
    const ordered = [...group].sort((left, right) => average(right) - average(left) || left.playerId - right.playerId);
    const groups: PlacementGroup[] = [];

    for (const entry of ordered) {
        const last = groups.at(-1);
        if (last && average(last[0]) === average(entry)) {
            last.push(entry);
        } else {
            groups.push([entry]);
        }
    }

    return groups;
}

function comparableAverage(value: number): number {
    return Math.round(value * 10_000);
}

function byPlayerId(group: PlacementGroup): PlacementGroup {
    return [...group].sort((left, right) => left.playerId - right.playerId);
}

function outcomeOf(rule: AdvancementRouting | undefined): string {
    return rule ? `${rule.targetKind}:${rule.targetId}:${rule.targetSlot}` : "none";
}
