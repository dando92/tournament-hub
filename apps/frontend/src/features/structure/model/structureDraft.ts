import type { BracketPlan } from "@tournament-hub/brackets";
import type { AdvancementRuleDto, PlanNode, StructurePlan } from "@tournament-hub/contracts";
import type { PhaseGroup } from "@/features/division/model/types";
import type { Match } from "@/features/match/model/types";
import type { TournamentDivisionOption, TournamentDivisionOptionPhase } from "@/features/tournament/model/types";

export type DraftKind = "phase" | "pool" | "match";

export type NodeRef = { kind: DraftKind; id: number };

export type RoutableKind = "pool" | "match";

export type DraftAddition = NodeRef & { parentId: number; name: string };
export type DraftRename = NodeRef & { name: string };
export type DraftRoute = { sourceKind: RoutableKind; sourceId: number; placement: number; targetKind: RoutableKind; targetId: number; slot: number };
export type DraftSlot = { targetKind: RoutableKind; targetId: number; slot: number };
export type DraftSeating = { matchId: number; entrantIds: number[] };
export type DraftSongs = { matchId: number; songIds: number[] };
export type EntrantRef = { id: number; name: string };

export type StructureDraft = {
    tournamentId: number;
    divisionId: number;
    added: DraftAddition[];
    renamed: DraftRename[];
    removed: NodeRef[];
    routes: DraftRoute[];
    cleared: DraftSlot[];
    seated: DraftSeating[];
    songs: DraftSongs[];
};

export function emptyDraft(tournamentId: number, divisionId: number): StructureDraft {
    return { tournamentId, divisionId, added: [], renamed: [], removed: [], routes: [], cleared: [], seated: [], songs: [] };
}

export function changeCount(draft: StructureDraft): number {
    return draft.added.length + draft.renamed.length + draft.removed.length + draft.routes.length + draft.cleared.length + draft.seated.length + draft.songs.length;
}

export function isPending(id: number): boolean {
    return id < 0;
}

function keyOf(ref: NodeRef): string {
    return `${ref.kind}:${ref.id}`;
}

function same(left: NodeRef, right: NodeRef): boolean {
    return left.kind === right.kind && left.id === right.id;
}

function nextId(draft: StructureDraft): number {
    return Math.min(0, ...draft.added.map((node) => node.id)) - 1;
}

export function addNode(draft: StructureDraft, kind: DraftKind, parentId: number, name: string): StructureDraft {
    return { ...draft, added: [...draft.added, { kind, id: nextId(draft), parentId, name }] };
}

export type BracketRequest = {
    phaseId?: number;
    phaseName: string;
    poolName: string;
    bracket: BracketPlan;
};

export function addBracket(draft: StructureDraft, divisionId: number, request: BracketRequest): StructureDraft {
    let next = draft;
    let phaseId = request.phaseId;

    if (phaseId === undefined) {
        next = addNode(next, "phase", divisionId, request.phaseName);
        phaseId = next.added.at(-1)!.id;
    }

    next = addNode(next, "pool", phaseId, request.poolName);
    const poolId = next.added.at(-1)!.id;

    const idOfLocal = new Map<string, number>();
    for (const match of request.bracket.matches) {
        next = addNode(next, "match", poolId, match.name);
        idOfLocal.set(match.localId, next.added.at(-1)!.id);
    }

    const routes = request.bracket.routes.flatMap((route) => {
        const sourceId = idOfLocal.get(route.sourceMatchLocalId);
        const targetId = idOfLocal.get(route.targetMatchLocalId);
        if (sourceId === undefined || targetId === undefined) {
            return [];
        }

        return [
            {
                sourceKind: "match" as const,
                sourceId,
                placement: route.sourcePlacement,
                targetKind: "match" as const,
                targetId,
                slot: route.targetSlot,
            },
        ];
    });

    return { ...next, routes: [...next.routes, ...routes] };
}

export function renameNode(draft: StructureDraft, ref: NodeRef, name: string): StructureDraft {
    if (isPending(ref.id)) {
        return { ...draft, added: draft.added.map((node) => (same(node, ref) ? { ...node, name } : node)) };
    }

    return { ...draft, renamed: [...draft.renamed.filter((entry) => !same(entry, ref)), { ...ref, name }] };
}

export function removeNode(draft: StructureDraft, ref: NodeRef, tree: StructureIndex): StructureDraft {
    const gone = [ref, ...descendantsOf(ref, draft, tree)];
    const isGone = (candidate: NodeRef) => gone.some((entry) => same(entry, candidate));
    const touchesGone = (kind: RoutableKind, id: number) => isGone({ kind, id });

    return {
        ...draft,
        added: draft.added.filter((node) => !isGone(node)),
        renamed: draft.renamed.filter((entry) => !isGone(entry)),
        removed: [...draft.removed.filter((entry) => !isGone(entry)), ...gone.filter((entry) => !isPending(entry.id))],
        routes: draft.routes.filter((route) => !touchesGone(route.sourceKind, route.sourceId) && !touchesGone(route.targetKind, route.targetId)),
        cleared: draft.cleared.filter((slot) => !touchesGone(slot.targetKind, slot.targetId)),
        seated: draft.seated.filter((entry) => !isGone({ kind: "match", id: entry.matchId })),
        songs: draft.songs.filter((entry) => !isGone({ kind: "match", id: entry.matchId })),
    };
}

export function seatEntrants(draft: StructureDraft, matchId: number, entrantIds: number[]): StructureDraft {
    return { ...draft, seated: [...draft.seated.filter((entry) => entry.matchId !== matchId), { matchId, entrantIds }] };
}

export function setMatchSongs(draft: StructureDraft, matchId: number, songIds: number[]): StructureDraft {
    const rest = draft.songs.filter((entry) => entry.matchId !== matchId);

    return { ...draft, songs: songIds.length === 0 ? rest : [...rest, { matchId, songIds }] };
}

export function seatingOf(draft: StructureDraft, matchId: number): number[] | undefined {
    return draft.seated.find((entry) => entry.matchId === matchId)?.entrantIds;
}

export function songsOf(draft: StructureDraft, matchId: number): number[] {
    return draft.songs.find((entry) => entry.matchId === matchId)?.songIds ?? [];
}

export function drawRoute(draft: StructureDraft, route: DraftRoute): StructureDraft {
    const claimsSlot = (slot: DraftSlot) => slot.targetKind === route.targetKind && slot.targetId === route.targetId && slot.slot === route.slot;

    return {
        ...draft,
        routes: [...draft.routes.filter((existing) => !claimsSlot(existing)), route],
        cleared: draft.cleared.filter((slot) => !claimsSlot(slot)),
    };
}

export function clearSlot(draft: StructureDraft, slot: DraftSlot): StructureDraft {
    const claimsSlot = (candidate: DraftSlot) => candidate.targetKind === slot.targetKind && candidate.targetId === slot.targetId && candidate.slot === slot.slot;
    const drawnHere = draft.routes.some(claimsSlot);

    return {
        ...draft,
        routes: draft.routes.filter((route) => !claimsSlot(route)),
        cleared: drawnHere ? draft.cleared : [...draft.cleared.filter((candidate) => !claimsSlot(candidate)), slot],
    };
}

export type StructureIndex = {
    parentOf: Map<string, NodeRef>;
    nameOf: Map<string, string>;
};

export function indexStructure(division: TournamentDivisionOption | undefined, matches: Match[], draft: StructureDraft): StructureIndex {
    const parentOf = new Map<string, NodeRef>();
    const nameOf = new Map<string, string>();

    for (const phase of division?.phases ?? []) {
        nameOf.set(keyOf({ kind: "phase", id: phase.id }), phase.name);
        for (const pool of phase.phaseGroups ?? []) {
            parentOf.set(keyOf({ kind: "pool", id: pool.id }), { kind: "phase", id: phase.id });
            nameOf.set(keyOf({ kind: "pool", id: pool.id }), pool.name);
        }
    }
    for (const match of matches) {
        parentOf.set(keyOf({ kind: "match", id: match.id }), { kind: "pool", id: match.phaseGroupId });
        nameOf.set(keyOf({ kind: "match", id: match.id }), match.name);
    }
    for (const node of draft.added) {
        const parent = parentKindOf(node.kind);
        if (parent) {
            parentOf.set(keyOf(node), { kind: parent, id: node.parentId });
        }
        nameOf.set(keyOf(node), node.name);
    }
    for (const entry of draft.renamed) {
        nameOf.set(keyOf(entry), entry.name);
    }

    return { parentOf, nameOf };
}

function parentKindOf(kind: DraftKind): DraftKind | null {
    if (kind === "match") {
        return "pool";
    }

    return kind === "pool" ? "phase" : null;
}

function descendantsOf(ref: NodeRef, draft: StructureDraft, tree: StructureIndex): NodeRef[] {
    const found: NodeRef[] = [];

    for (const [key, parent] of tree.parentOf) {
        if (!same(parent, ref)) {
            continue;
        }
        const [kind, id] = key.split(":");
        const child = { kind: kind as DraftKind, id: Number(id) };
        found.push(child, ...descendantsOf(child, draft, tree));
    }

    return found;
}

export type ProjectedStructure = {
    division: TournamentDivisionOption | undefined;
    matches: Match[];
    pending: Set<string>;
};

export function projectStructure(
    division: TournamentDivisionOption | undefined,
    matches: Match[],
    draft: StructureDraft,
    roster: EntrantRef[] = [],
): ProjectedStructure {
    if (!division) {
        return { division, matches, pending: new Set() };
    }

    const removed = new Set(draft.removed.map(keyOf));
    const renamed = new Map(draft.renamed.map((entry) => [keyOf(entry), entry.name]));
    const named = <T extends { id: number; name: string }>(kind: DraftKind, row: T): T => ({ ...row, name: renamed.get(`${kind}:${row.id}`) ?? row.name });
    const kept = (kind: DraftKind, id: number) => !removed.has(`${kind}:${id}`);

    const rules = projectRules(division, matches, draft, removed);
    const addedOf = (kind: DraftKind, parentId: number) => draft.added.filter((node) => node.kind === kind && node.parentId === parentId);

    const countIn = (poolId: number) =>
        draft.added.filter((node) => node.kind === "match" && node.parentId === poolId).length -
        matches.filter((match) => match.phaseGroupId === poolId && removed.has(`match:${match.id}`)).length;

    const projectPool = (pool: PhaseGroup): PhaseGroup => ({
        ...named("pool", pool),
        matchCount: Math.max(pool.matchCount + countIn(pool.id), 0),
        advancementRules: rules.filter((rule) => rule.sourceKind === "phase_group" && rule.sourceId === pool.id),
    });

    const poolsOf = (phaseId: number, existing: PhaseGroup[]) => [
        ...existing.filter((pool) => kept("pool", pool.id)).map(projectPool),
        ...addedOf("pool", phaseId).map((node) => newPool(node, rules, countIn(node.id))),
    ];

    const phases: TournamentDivisionOptionPhase[] = [
        ...division.phases
            .filter((phase) => kept("phase", phase.id))
            .map((phase) => ({ ...named("phase", phase), phaseGroups: poolsOf(phase.id, phase.phaseGroups ?? []) })),
        ...addedOf("phase", division.id).map((node) => ({ id: node.id, name: node.name, matchCount: 0, phaseGroups: poolsOf(node.id, []) })),
    ].map((phase) => ({ ...phase, matchCount: (phase.phaseGroups ?? []).reduce((total, pool) => total + pool.matchCount, 0) }));

    return {
        division: { ...division, phases },
        matches: projectMatches(division, matches, draft, removed, renamed, rules, roster),
        pending: new Set(draft.added.filter((node) => node.kind !== "phase").map((node) => `${node.kind}:${node.id}`)),
    };
}

function newPool(node: DraftAddition, rules: AdvancementRuleDto[], matchCount: number): PhaseGroup {
    return {
        id: node.id,
        name: node.name,
        displayIdentifier: null,
        bracketType: null,
        state: "pending",
        matchCount,
        progressedMatchCount: 0,
        pendingMatchCount: 0,
        advancementRules: rules.filter((rule) => rule.sourceKind === "phase_group" && rule.sourceId === node.id),
    } as PhaseGroup;
}

function projectMatches(
    division: TournamentDivisionOption,
    matches: Match[],
    draft: StructureDraft,
    removed: Set<string>,
    renamed: Map<string, string>,
    rules: AdvancementRuleDto[],
    roster: EntrantRef[],
): Match[] {
    const rulesOf = (id: number) => rules.filter((rule) => touches(rule, "match", id));
    const entrantById = new Map(roster.map((entrant) => [entrant.id, entrant]));
    const seatsOf = (id: number, current: Match["entrants"]) => {
        const seating = seatingOf(draft, id);

        return seating === undefined ? current : (seating.map((entrantId) => entrantById.get(entrantId)).filter(Boolean) as Match["entrants"]);
    };
    const roundsOf = (id: number, current: Match["rounds"]) => [
        ...(current ?? []),
        ...songsOf(draft, id).map((songId) => ({ id: -songId, song: { id: songId }, standings: [] }) as unknown as Match["rounds"][number]),
    ];

    const existing = matches
        .filter((match) => !removed.has(`match:${match.id}`) && !removed.has(`pool:${match.phaseGroupId}`))
        .map((match) => ({
            ...match,
            name: renamed.get(`match:${match.id}`) ?? match.name,
            advancementRules: rulesOf(match.id),
            entrants: seatsOf(match.id, match.entrants),
            rounds: roundsOf(match.id, match.rounds),
        }));

    const added = draft.added
        .filter((node) => node.kind === "match")
        .map(
            (node) =>
                ({
                    id: node.id,
                    name: node.name,
                    subtitle: "",
                    notes: "",
                    active: false,
                    state: "open",
                    entrants: seatsOf(node.id, []),
                    rounds: roundsOf(node.id, []),
                    tiebreaks: [],
                    resultState: { status: "incomplete", entries: [], ambiguousTies: [] },
                    matchResult: null,
                    phaseGroupId: node.parentId,
                    advancementRules: rulesOf(node.id),
                }) as unknown as Match,
        );

    const poolOrder = division.phases.flatMap((phase) => (phase.phaseGroups ?? []).map((pool) => pool.id));

    return [...existing, ...added].sort((left, right) => poolOrder.indexOf(left.phaseGroupId) - poolOrder.indexOf(right.phaseGroupId));
}

function touches(rule: AdvancementRuleDto, kind: RoutableKind, id: number): boolean {
    const wanted = kind === "pool" ? "phase_group" : "match";

    return (rule.sourceKind === wanted && rule.sourceId === id) || (rule.targetKind === wanted && rule.targetId === id);
}

function projectRules(
    division: TournamentDivisionOption,
    matches: Match[],
    draft: StructureDraft,
    removed: Set<string>,
): AdvancementRuleDto[] {
    const existing = new Map<string, AdvancementRuleDto>();
    for (const pool of division.phases.flatMap((phase) => phase.phaseGroups ?? [])) {
        for (const rule of pool.advancementRules ?? []) {
            existing.set(`${rule.targetKind}:${rule.targetId}:${rule.targetSlot}`, rule);
        }
    }
    for (const match of matches) {
        for (const rule of match.advancementRules ?? []) {
            existing.set(`${rule.targetKind}:${rule.targetId}:${rule.targetSlot}`, rule);
        }
    }

    const isGone = (kind: AdvancementRuleDto["sourceKind"], id: number) => removed.has(`${kind === "match" ? "match" : "pool"}:${id}`);
    for (const [key, rule] of existing) {
        if (isGone(rule.sourceKind, rule.sourceId) || isGone(rule.targetKind, rule.targetId)) {
            existing.delete(key);
        }
    }
    for (const slot of draft.cleared) {
        existing.delete(slotKey(slot.targetKind, slot.targetId, slot.slot));
    }

    const nameOf = namesOf(division, matches, draft);
    for (const [index, route] of draft.routes.entries()) {
        existing.set(slotKey(route.targetKind, route.targetId, route.slot), {
            id: -(index + 1),
            sourceKind: route.sourceKind === "pool" ? "phase_group" : "match",
            sourceId: route.sourceId,
            sourceName: nameOf(route.sourceKind, route.sourceId),
            sourcePlacement: route.placement,
            targetKind: route.targetKind === "pool" ? "phase_group" : "match",
            targetId: route.targetId,
            targetName: nameOf(route.targetKind, route.targetId),
            targetSlot: route.slot,
        });
    }

    return [...existing.values()];
}

function slotKey(kind: RoutableKind, id: number, slot: number): string {
    return `${kind === "pool" ? "phase_group" : "match"}:${id}:${slot}`;
}

function namesOf(division: TournamentDivisionOption, matches: Match[], draft: StructureDraft): (kind: RoutableKind, id: number) => string {
    const index = indexStructure(division, matches, draft);

    return (kind, id) => index.nameOf.get(`${kind}:${id}`) ?? "elsewhere";
}

export function toStructurePlan(draft: StructureDraft, divisionName: string, tree: StructureIndex, structureVersion: number): StructurePlan {
    const nodes = new Map<string, PlanNode>();
    const divisionLocalId = `division:${draft.divisionId}`;

    nodes.set(divisionLocalId, { localId: divisionLocalId, kind: "division", action: "link", localRowId: draft.divisionId, name: divisionName });

    function ensure(ref: NodeRef): string {
        const localId = keyOf(ref);
        if (nodes.has(localId)) {
            return localId;
        }

        const parent = tree.parentOf.get(localId);
        const parentLocalId = parent ? ensure(parent) : divisionLocalId;
        const name = tree.nameOf.get(localId) ?? "";
        const kind = planKindOf(ref.kind);

        if (isPending(ref.id)) {
            nodes.set(localId, { localId, kind, parentLocalId, action: "create", name });
        } else {
            nodes.set(localId, { localId, kind, parentLocalId, action: "link", localRowId: ref.id, name });
        }

        return localId;
    }

    for (const node of draft.added) {
        ensure(node);
    }
    for (const entry of draft.renamed) {
        ensure(entry);
    }
    for (const route of draft.routes) {
        ensure({ kind: route.sourceKind, id: route.sourceId });
        ensure({ kind: route.targetKind, id: route.targetId });
    }
    for (const slot of draft.cleared) {
        ensure({ kind: slot.targetKind, id: slot.targetId });
    }
    for (const entry of draft.seated) {
        const localId = ensure({ kind: "match", id: entry.matchId });
        nodes.set(localId, { ...nodes.get(localId)!, entrantRowIds: entry.entrantIds });
    }
    for (const entry of draft.songs) {
        const localId = ensure({ kind: "match", id: entry.matchId });
        nodes.set(localId, { ...nodes.get(localId)!, songIds: entry.songIds });
    }
    for (const ref of draft.removed) {
        const localId = ensure(ref);
        nodes.set(localId, { ...nodes.get(localId)!, action: "remove" });
    }

    return {
        tournamentId: draft.tournamentId,
        source: { kind: "manual" },
        basedOn: [{ divisionId: draft.divisionId, structureVersion }],
        nodes: [...nodes.values()],
        routes: draft.routes.map((route) => ({
            sourceLocalId: keyOf({ kind: route.sourceKind, id: route.sourceId }),
            sourcePlacement: route.placement,
            targetLocalId: keyOf({ kind: route.targetKind, id: route.targetId }),
            targetSlot: route.slot,
        })),
        clearedSlots: draft.cleared.map((slot) => ({ targetLocalId: keyOf({ kind: slot.targetKind, id: slot.targetId }), targetSlot: slot.slot })),
    };
}

function planKindOf(kind: DraftKind): PlanNode["kind"] {
    if (kind === "pool") {
        return "phaseGroup";
    }

    return kind;
}
