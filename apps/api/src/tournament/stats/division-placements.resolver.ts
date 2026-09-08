import type {
    AdvancementCompetitionKind,
    DivisionPlacementRowDto,
    DivisionPlacementsDto,
    EntrantStatus,
    PlacementRunStepDto,
} from '@tournament-hub/contracts';

export type PlacementCompetition = {
    kind: AdvancementCompetitionKind;
    id: number;
    name: string;
    phaseGroupId: number | null;
    decided: boolean;
    entrantIds: number[];
    placements: Array<{ entrantId: number; placement: number }>;
};

export type PlacementEdge = {
    sourceKind: AdvancementCompetitionKind;
    sourceId: number;
    targetKind: AdvancementCompetitionKind;
    targetId: number;
};

export type PlacementEntrant = {
    entrantId: number;
    entrantName: string;
    playerId: number | null;
    playerName: string | null;
    status: EntrantStatus;
    nationality: string;
    seedNum: number | null;
    points: number;
    songsPlayed: number;
    averagePercentage: number | null;
};

export type DivisionPlacementInput = {
    divisionId: number;
    divisionName: string;
    competitions: PlacementCompetition[];
    edges: PlacementEdge[];
    entrants: PlacementEntrant[];
};

type NodeKey = string;

type ExitNode = {
    node: PlacementCompetition;
    depth: number;
    placement: number;
};

type Exit = ExitNode & { entrant: PlacementEntrant; run: PlacementRunStepDto[] };

export function resolveDivisionPlacements(input: DivisionPlacementInput): DivisionPlacementsDto {
    const graph = buildGraph(input.competitions, input.edges);
    const exits = collectExits(input.entrants, graph);

    return {
        divisionId: input.divisionId,
        divisionName: input.divisionName,
        complete: isComplete(input.competitions),
        endings: graph.nodes.filter((node) => (graph.outgoing.get(keyOf(node)) ?? new Set()).size === 0).length,
        rows: bandRows(exits),
    };
}

type Graph = {
    nodes: PlacementCompetition[];
    outgoing: Map<NodeKey, Set<NodeKey>>;
    depths: Map<NodeKey, number>;
};

function keyOf(competition: Pick<PlacementCompetition, 'kind' | 'id'>): NodeKey {
    return `${competition.kind}:${competition.id}`;
}

function buildGraph(competitions: PlacementCompetition[], edges: PlacementEdge[]): Graph {
    const poolOfMatch = new Map<number, number>();
    const matchesOfPool = new Map<number, number[]>();

    for (const competition of competitions) {
        if (competition.kind !== 'match' || competition.phaseGroupId === null) {
            continue;
        }
        poolOfMatch.set(competition.id, competition.phaseGroupId);
        matchesOfPool.set(competition.phaseGroupId, [...(matchesOfPool.get(competition.phaseGroupId) ?? []), competition.id]);
    }

    const bracketPools = findBracketPools(edges, poolOfMatch);
    const nodes = competitions.filter((competition) =>
        competition.kind === 'match'
            ? competition.phaseGroupId === null || bracketPools.has(competition.phaseGroupId)
            : !bracketPools.has(competition.id),
    );
    const nodeKeys = new Set(nodes.map(keyOf));

    const resolve = (kind: AdvancementCompetitionKind, id: number): NodeKey[] => {
        if (nodeKeys.has(keyOf({ kind, id }))) {
            return [keyOf({ kind, id })];
        }
        if (kind === 'match') {
            const pool = poolOfMatch.get(id);

            return pool === undefined ? [] : [keyOf({ kind: 'phase_group', id: pool })];
        }

        return (matchesOfPool.get(id) ?? []).map((matchId) => keyOf({ kind: 'match', id: matchId }));
    };

    const outgoing = new Map<NodeKey, Set<NodeKey>>(nodes.map((node) => [keyOf(node), new Set<NodeKey>()]));
    for (const edge of edges) {
        for (const from of resolve(edge.sourceKind, edge.sourceId)) {
            for (const to of resolve(edge.targetKind, edge.targetId)) {
                if (from !== to) {
                    outgoing.get(from)?.add(to);
                }
            }
        }
    }

    return { nodes, outgoing, depths: measureDepths(nodes, outgoing) };
}

function findBracketPools(edges: PlacementEdge[], poolOfMatch: Map<number, number>): Set<number> {
    const pools = new Set<number>();

    for (const edge of edges) {
        if (edge.sourceKind !== 'match' || edge.targetKind !== 'match') {
            continue;
        }
        const pool = poolOfMatch.get(edge.sourceId);
        if (pool !== undefined && pool === poolOfMatch.get(edge.targetId)) {
            pools.add(pool);
        }
    }

    return pools;
}

function measureDepths(nodes: PlacementCompetition[], outgoing: Map<NodeKey, Set<NodeKey>>): Map<NodeKey, number> {
    const depths = new Map<NodeKey, number>();

    const walk = (key: NodeKey, visiting: Set<NodeKey>): number => {
        const known = depths.get(key);
        if (known !== undefined) {
            return known;
        }
        if (visiting.has(key)) {
            return 0;
        }

        visiting.add(key);
        let depth = 0;
        for (const next of outgoing.get(key) ?? []) {
            depth = Math.max(depth, 1 + walk(next, visiting));
        }
        visiting.delete(key);
        depths.set(key, depth);

        return depth;
    };

    for (const node of nodes) {
        walk(keyOf(node), new Set());
    }

    return depths;
}

function collectExits(entrants: PlacementEntrant[], graph: Graph): Exit[] {
    const byEntrant = new Map<number, ExitNode[]>();

    for (const node of graph.nodes) {
        const depth = graph.depths.get(keyOf(node)) ?? 0;
        const placements = new Map(node.placements.map((entry) => [entry.entrantId, entry.placement]));

        for (const entrantId of node.entrantIds) {
            const stop = { node, depth, placement: placements.get(entrantId) ?? node.entrantIds.length + 1 };
            byEntrant.set(entrantId, [...(byEntrant.get(entrantId) ?? []), stop]);
        }
    }

    return entrants
        .map((entrant) => {
            const stops = byEntrant.get(entrant.entrantId);
            if (!stops || stops.length === 0) {
                return null;
            }

            const exit = stops.reduce((held, candidate) => (isCloserToTheEnd(candidate, held) ? candidate : held));

            return { ...exit, entrant, run: runOf(stops) };
        })
        .filter((exit): exit is Exit => exit !== null);
}

function runOf(stops: ExitNode[]): PlacementRunStepDto[] {
    return [...stops]
        .sort((left, right) => right.depth - left.depth || left.node.id - right.node.id)
        .map((stop) => ({ label: roundLabel(stop.depth), name: stop.node.name, won: stop.placement === 1 }));
}

function roundLabel(depth: number): string {
    if (depth === 0) {
        return 'F';
    }
    if (depth === 1) {
        return 'SF';
    }
    if (depth === 2) {
        return 'QF';
    }

    return `R${2 ** (depth + 1)}`;
}

function isCloserToTheEnd(candidate: ExitNode, held: ExitNode): boolean {
    return (
        candidate.depth < held.depth ||
        (candidate.depth === held.depth && candidate.placement < held.placement) ||
        (candidate.depth === held.depth && candidate.placement === held.placement && candidate.node.id < held.node.id)
    );
}

function bandRows(exits: Exit[]): DivisionPlacementRowDto[] {
    const ordered = [...exits].sort(
        (left, right) =>
            left.depth - right.depth ||
            left.placement - right.placement ||
            left.entrant.entrantName.localeCompare(right.entrant.entrantName) ||
            left.entrant.entrantId - right.entrant.entrantId,
    );

    const rows: DivisionPlacementRowDto[] = [];
    let index = 0;

    while (index < ordered.length) {
        let end = index + 1;
        while (end < ordered.length && ordered[end].depth === ordered[index].depth && ordered[end].placement === ordered[index].placement) {
            end += 1;
        }

        for (const exit of ordered.slice(index, end)) {
            rows.push({
                entrantId: exit.entrant.entrantId,
                entrantName: exit.entrant.entrantName,
                playerId: exit.entrant.playerId,
                playerName: exit.entrant.playerName,
                status: exit.entrant.status,
                nationality: exit.entrant.nationality,
                seedNum: exit.entrant.seedNum,
                placement: index + 1,
                sharedThrough: end,
                exitKind: exit.node.kind,
                exitId: exit.node.id,
                exitName: exit.node.name,
                points: exit.entrant.points,
                songsPlayed: exit.entrant.songsPlayed,
                averagePercentage: exit.entrant.averagePercentage,
                run: exit.run,
            });
        }

        index = end;
    }

    return rows;
}

function isComplete(competitions: PlacementCompetition[]): boolean {
    const matches = competitions.filter((competition) => competition.kind === 'match');

    return matches.length > 0 && matches.every((match) => match.decided);
}
