import type { Status } from "@/shared/components/ui/status";
import type { PhaseGroup } from "@/features/division/model/types";
import type { Match } from "@/features/match/model/types";
import type { TournamentDivisionOption, TournamentDivisionOptionPhase } from "@/features/tournament/model/types";
import { implicitPool } from "@/features/division/model/poolVisibility";
import { phaseStatus, poolStatus } from "@/features/tournament/model/treeStatus";
import { getMatchProgress, getMatchProgressStatus } from "@/features/match/model/matchStatus";


export const COLUMN_WIDTH = 236;
export const COLUMN_GAP = 46;
export const HEADER_HEIGHT = 54;
export const CARD_GAP = 10;
export const SLOT_HEIGHT = 38;
export const MATCH_SLOT_HEIGHT = 32;
export const NEST_INDENT = 14;
const FIRST_CARD_TOP = HEADER_HEIGHT + CARD_GAP;
const NESTED_GAP = 6;

const CARD_PADDING_Y = 8;
const NAME_ROW = 20;
const META_ROW = 16;
const SLOT_ROW = 18;
const SLOT_BLOCK_GAP = 2;
const CHIP_ROW = 20;
const CHIP_BLOCK_GAP = 6;
const CHIPS_PER_ROW = 4;
export const CHIP_RAIL_WIDTH = 40;
export const CHIP_RAIL_GAP = 6;
const CHIP_RAIL_ROW = 18;

export type PlacementChip = {
    placement: number;
    label: string;
    routed: boolean;
};

export type CanvasCard = {
    key: string;
    kind: "pool" | "match";
    id: number;
    name: string;
    status: Status;
    meta: string[];
    chips: PlacementChip[];
    slots: { slot: number; from: string | null }[];
    top: number;
    height: number;
    left: number;
    width: number;
    poolId: number;
    pending: boolean;
    faulted?: boolean;
    folded?: boolean;
};

export type CanvasSlot = {
    key: string;
    noun: "Pool" | "Match";
    parentId: number;
    top: number;
    left: number;
    width: number;
    height: number;
};

export type CanvasColumn = {
    phaseId: number;
    name: string;
    status: Status;
    meta: string;
    left: number;
    height: number;
    poolId: number | null;
    chips: PlacementChip[];
    faulted: boolean;
    cards: CanvasCard[];
    slots: CanvasSlot[];
};

export type CanvasEdge = {
    key: string;
    path: string;
    highlighted: boolean;
};

export type StructureCanvas = {
    columns: CanvasColumn[];
    edges: CanvasEdge[];
    width: number;
    height: number;
    addColumnLeft: number;
    danglingPlacements: number;
};

export type CanvasSelection = { kind: "pool" | "match" | "phase"; id: number } | null;

export type ArmedPlacement = { kind: "pool" | "match"; id: number; placement: number };

export type StructureCanvasInput = {
    division: TournamentDivisionOption | undefined;
    matches: Match[];
    selection: CanvasSelection;
    pending?: Set<string>;
    folded?: Set<string>;
    faulted?: Set<string>;
    advancingPlaces?: number;
};

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

export function ordinal(placement: number): string {
    return ORDINALS[placement - 1] ?? `${placement}th`;
}

export function cardHeight(card: Pick<CanvasCard, "meta" | "chips" | "slots">): number {
    const head = CARD_PADDING_Y * 2 + NAME_ROW + Math.max(card.meta.length - 1, 0) * META_ROW;

    if (card.slots.length === 0) {
        if (card.chips.length === 0) {
            return head;
        }

        return head + CHIP_BLOCK_GAP + Math.ceil(card.chips.length / CHIPS_PER_ROW) * CHIP_ROW;
    }

    return head + SLOT_BLOCK_GAP + Math.max(card.slots.length * SLOT_ROW, card.chips.length * CHIP_RAIL_ROW);
}

export function headerHeight(chips: PlacementChip[]): number {
    if (chips.length === 0) {
        return HEADER_HEIGHT;
    }

    return HEADER_HEIGHT + CHIP_BLOCK_GAP + Math.ceil(chips.length / CHIPS_PER_ROW) * CHIP_ROW;
}

export function buildStructureCanvas(input: StructureCanvasInput): StructureCanvas {
    const phases = input.division?.phases ?? [];
    const matchesByPool = groupMatchesByPool(input.matches);
    const advancingPlaces = input.advancingPlaces ?? 2;
    const pending = input.pending ?? new Set<string>();
    const folded = input.folded ?? new Set<string>();
    const faulted = input.faulted ?? new Set<string>();

    const columns = phases.map((phase, index) =>
        buildColumn(phase, index * (COLUMN_WIDTH + COLUMN_GAP), matchesByPool, advancingPlaces, pending, folded, faulted),
    );

    const edges = buildEdges(input, anchorsOf(columns));
    const contentHeight = Math.max(...columns.map((column) => column.height), FIRST_CARD_TOP + SLOT_HEIGHT);
    const addColumnLeft = columns.length * (COLUMN_WIDTH + COLUMN_GAP);

    return {
        columns,
        edges,
        width: addColumnLeft + COLUMN_WIDTH,
        height: contentHeight,
        addColumnLeft,
        danglingPlacements: countDangling(phases, advancingPlaces),
    };
}

function buildColumn(
    phase: TournamentDivisionOptionPhase,
    left: number,
    matchesByPool: Map<number, Match[]>,
    advancingPlaces: number,
    pending: Set<string>,
    folded: Set<string>,
    faulted: Set<string>,
): CanvasColumn {
    const pools = phase.phaseGroups ?? [];
    const implicit = implicitPool(phase);
    const chips = implicit ? placementChips(implicit, advancingPlaces) : [];
    const cards: CanvasCard[] = [];
    const slots: CanvasSlot[] = [];

    let top = headerHeight(chips) + CARD_GAP;

    for (const pool of pools) {
        if (pool.id !== implicit?.id) {
            const card = sized(poolCard(pool, matchesByPool, placementChips(pool, advancingPlaces), pending, folded, faulted), top);
            cards.push(card);
            top += card.height + NESTED_GAP;
        }

        if (folded.has(poolKey(pool.id))) {
            top += CARD_GAP - NESTED_GAP;
            continue;
        }

        for (const match of matchesByPool.get(pool.id) ?? []) {
            const nested = sized(matchCard(match, pool, pending, faulted), top);
            cards.push(nested);
            top += nested.height + NESTED_GAP;
        }

        slots.push({
            key: `add-match:${pool.id}`,
            noun: "Match",
            parentId: pool.id,
            top,
            left: NEST_INDENT,
            width: COLUMN_WIDTH - NEST_INDENT,
            height: MATCH_SLOT_HEIGHT,
        });
        top += MATCH_SLOT_HEIGHT + CARD_GAP;
    }

    slots.push({ key: `add-pool:${phase.id}`, noun: "Pool", parentId: phase.id, top, left: 0, width: COLUMN_WIDTH, height: SLOT_HEIGHT });

    return {
        phaseId: phase.id,
        name: phase.name,
        status: phaseStatus(phase),
        meta: implicit ? poolMeta(implicit, matchesByPool) : phaseMeta(phase),
        left,
        height: top + SLOT_HEIGHT,
        poolId: implicit?.id ?? null,
        chips,
        faulted: faulted.has(`phase:${phase.id}`) || (implicit !== undefined && faulted.has(poolKey(implicit.id))),
        cards,
        slots,
    };
}

function groupMatchesByPool(matches: Match[]): Map<number, Match[]> {
    const byPool = new Map<number, Match[]>();
    for (const match of matches) {
        byPool.set(match.phaseGroupId, [...(byPool.get(match.phaseGroupId) ?? []), match]);
    }

    return byPool;
}

function phaseMeta(phase: TournamentDivisionOptionPhase): string {
    const pools = phase.phaseGroups ?? [];
    const poolPart = `${pools.length} ${pools.length === 1 ? "pool" : "pools"}`;

    return `${poolPart} · ${phase.matchCount} ${phase.matchCount === 1 ? "match" : "matches"}`;
}

function poolMeta(pool: PhaseGroup, matchesByPool: Map<number, Match[]>): string {
    return `${pool.matchCount} ${pool.matchCount === 1 ? "match" : "matches"} · ${poolProgress(pool, matchesByPool)}`;
}

function sized(card: Omit<CanvasCard, "top" | "height">, top: number): CanvasCard {
    return { ...card, top, height: cardHeight(card) };
}

function poolCard(
    pool: PhaseGroup,
    matchesByPool: Map<number, Match[]>,
    chips: PlacementChip[],
    pending: Set<string>,
    folded: Set<string>,
    faulted: Set<string>,
): Omit<CanvasCard, "top" | "height"> {
    return {
        key: poolKey(pool.id),
        kind: "pool",
        id: pool.id,
        name: pool.name,
        status: poolStatus(pool),
        meta: [`${pool.matchCount} ${pool.matchCount === 1 ? "match" : "matches"}`, poolProgress(pool, matchesByPool)],
        chips,
        slots: [],
        left: 0,
        width: COLUMN_WIDTH,
        poolId: pool.id,
        pending: pending.has(poolKey(pool.id)),
        folded: folded.has(poolKey(pool.id)),
        faulted: faulted.has(poolKey(pool.id)),
    };
}

function matchCard(match: Match, pool: PhaseGroup, pending: Set<string>, faulted: Set<string>): Omit<CanvasCard, "top" | "height"> {
    return {
        key: matchKey(match.id),
        kind: "match",
        id: match.id,
        name: match.name,
        status: getMatchProgressStatus(getMatchProgress(match)),
        meta: [],
        chips: routedChips((match.advancementRules ?? []).filter((rule) => rule.sourceKind === "match" && rule.sourceId === match.id)),
        slots: matchSlots(match),
        left: NEST_INDENT,
        width: COLUMN_WIDTH - NEST_INDENT,
        poolId: pool.id,
        pending: pending.has(matchKey(match.id)),
        faulted: faulted.has(matchKey(match.id)),
    };
}

function poolProgress(pool: PhaseGroup, matchesByPool: Map<number, Match[]>): string {
    if ((pool.pendingMatchCount ?? 0) > 0) {
        return `${pool.pendingMatchCount} waiting to commit`;
    }
    if ((pool.progressedMatchCount ?? 0) > 0) {
        return `${pool.progressedMatchCount} of ${pool.matchCount} played`;
    }

    return matchesByPool.has(pool.id) || pool.matchCount > 0 ? "not started" : "no matches";
}

function placementChips(pool: PhaseGroup, advancingPlaces: number): PlacementChip[] {
    const routed = new Set(poolRulesOf(pool).map((rule) => rule.sourcePlacement));
    const places = new Set<number>([...routed]);
    for (let placement = 1; placement <= advancingPlaces; placement++) {
        places.add(placement);
    }

    return [...places].sort((left, right) => left - right).map((placement) => ({ placement, label: ordinal(placement), routed: routed.has(placement) }));
}

function routedChips(rules: { sourcePlacement: number }[]): PlacementChip[] {
    const routed = [...new Set(rules.map((rule) => rule.sourcePlacement))].sort((left, right) => left - right);
    const next = (routed.at(-1) ?? 0) + 1;

    return [...routed.map((placement) => ({ placement, label: ordinal(placement), routed: true })), { placement: next, label: ordinal(next), routed: false }];
}

function poolRulesOf(pool: PhaseGroup): NonNullable<PhaseGroup["advancementRules"]> {
    return (pool.advancementRules ?? []).filter((rule) => rule.sourceKind === "phase_group" && rule.sourceId === pool.id);
}

function matchSlots(match: Match): { slot: number; from: string | null }[] {
    const incoming = (match.advancementRules ?? []).filter((rule) => rule.targetKind === "match" && rule.targetId === match.id);
    const slotCount = Math.max(match.entrants?.length ?? 0, ...incoming.map((rule) => rule.targetSlot), 2);

    return Array.from({ length: slotCount }, (_, index) => {
        const slot = index + 1;
        const rule = incoming.find((candidate) => candidate.targetSlot === slot);
        if (rule) {
            return { slot, from: `${ordinal(rule.sourcePlacement)} of ${rule.sourceName ?? "elsewhere"}` };
        }

        const entrant = match.entrants?.[index];

        return { slot, from: entrant ? entrant.name : null };
    });
}

type Anchor = { left: number; right: number; y: number };

function anchorsOf(columns: CanvasColumn[]): Map<string, Anchor> {
    const anchors = new Map<string, Anchor>();

    for (const column of columns) {
        if (column.poolId !== null) {
            anchors.set(poolKey(column.poolId), {
                left: column.left,
                right: column.left + COLUMN_WIDTH,
                y: headerHeight(column.chips) / 2,
            });
        }
        for (const card of column.cards) {
            anchors.set(card.key, { left: column.left + card.left, right: column.left + card.left + card.width, y: card.top + card.height / 2 });
        }
    }

    return anchors;
}

type CanvasRule = { sourceKind: "pool" | "match"; sourceId: number; targetKind: "pool" | "match"; targetId: number };

function buildEdges(input: StructureCanvasInput, anchors: Map<string, Anchor>): CanvasEdge[] {
    const edges: CanvasEdge[] = [];
    const seen = new Set<string>();
    const poolOfMatch = new Map(input.matches.map((match) => [match.id, match.phaseGroupId]));

    function anchorOf(kind: "pool" | "match", id: number): Anchor | undefined {
        const own = anchors.get(kind === "pool" ? poolKey(id) : matchKey(id));
        if (own || kind === "pool") {
            return own;
        }

        const poolId = poolOfMatch.get(id);

        return poolId === undefined ? undefined : anchors.get(poolKey(poolId));
    }

    for (const rule of allRules(input)) {
        const source = anchorOf(rule.sourceKind, rule.sourceId);
        const target = anchorOf(rule.targetKind, rule.targetId);
        if (!source || !target || source === target) {
            continue;
        }

        const key = `${rule.sourceKind}:${rule.sourceId}->${rule.targetKind}:${rule.targetId}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);

        const midpoint = source.right + (target.left - source.right) / 2;
        edges.push({
            key,
            path: `M ${source.right} ${source.y} C ${midpoint} ${source.y}, ${midpoint} ${target.y}, ${target.left} ${target.y}`,
            highlighted: touchesSelection(input.selection, rule),
        });
    }

    return edges;
}

function allRules(input: StructureCanvasInput): CanvasRule[] {
    const pools = (input.division?.phases ?? []).flatMap((phase) => phase.phaseGroups ?? []);

    const fromPools = pools.flatMap((pool) =>
        poolRulesOf(pool).map((rule) => ({
            sourceKind: "pool" as const,
            sourceId: pool.id,
            targetKind: rule.targetKind === "phase_group" ? ("pool" as const) : ("match" as const),
            targetId: rule.targetId,
        })),
    );

    const fromMatches = input.matches.flatMap((match) =>
        (match.advancementRules ?? [])
            .filter((rule) => rule.sourceKind === "match" && rule.sourceId === match.id)
            .map((rule) => ({
                sourceKind: "match" as const,
                sourceId: match.id,
                targetKind: rule.targetKind === "phase_group" ? ("pool" as const) : ("match" as const),
                targetId: rule.targetId,
            })),
    );

    return [...fromPools, ...fromMatches];
}

function touchesSelection(selection: CanvasSelection, rule: CanvasRule): boolean {
    if (!selection || selection.kind === "phase") {
        return false;
    }

    return (rule.sourceKind === selection.kind && rule.sourceId === selection.id) || (rule.targetKind === selection.kind && rule.targetId === selection.id);
}

function countDangling(phases: TournamentDivisionOptionPhase[], advancingPlaces: number): number {
    const pools = phases.flatMap((phase) => phase.phaseGroups ?? []);
    const terminal = new Set((phases.at(-1)?.phaseGroups ?? []).map((pool) => pool.id));

    return pools
        .filter((pool) => !terminal.has(pool.id))
        .reduce((total, pool) => total + placementChips(pool, advancingPlaces).filter((chip) => !chip.routed).length, 0);
}

export function poolKey(id: number): string {
    return `pool:${id}`;
}

export function matchKey(id: number): string {
    return `match:${id}`;
}
