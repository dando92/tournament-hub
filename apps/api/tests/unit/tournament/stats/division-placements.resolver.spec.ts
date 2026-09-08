import { DivisionPlacementInput, PlacementCompetition, PlacementEdge, PlacementEntrant, resolveDivisionPlacements } from '@tournament/stats/division-placements.resolver';

function entrant(entrantId: number, averagePercentage: number | null = 90): PlacementEntrant {
    return {
        entrantId,
        entrantName: `Entrant ${entrantId}`,
        playerId: entrantId,
        playerName: `Player ${entrantId}`,
        status: 'active',
        nationality: 'IT',
        seedNum: entrantId,
        points: 0,
        songsPlayed: 2,
        averagePercentage,
    };
}

function match(id: number, phaseGroupId: number | null, order: number[][]): PlacementCompetition {
    return {
        kind: 'match',
        id,
        name: `Match ${id}`,
        phaseGroupId,
        decided: order.length > 0,
        entrantIds: order.flat(),
        placements: order.flatMap((tied, index) => tied.map((entrantId) => ({ entrantId, placement: index + 1 }))),
    };
}

function pool(id: number, order: number[][]): PlacementCompetition {
    return {
        kind: 'phase_group',
        id,
        name: `Pool ${id}`,
        phaseGroupId: null,
        decided: true,
        entrantIds: order.flat(),
        placements: order.flatMap((tied, index) => tied.map((entrantId) => ({ entrantId, placement: index + 1 }))),
    };
}

function edge(sourceId: number, targetId: number, kinds: [PlacementEdge['sourceKind'], PlacementEdge['targetKind']] = ['match', 'match']): PlacementEdge {
    return { sourceKind: kinds[0], sourceId, targetKind: kinds[1], targetId };
}

function division(competitions: PlacementCompetition[], edges: PlacementEdge[], entrants: PlacementEntrant[]): DivisionPlacementInput {
    return { divisionId: 1, divisionName: 'Open', competitions, edges, entrants };
}

function bands(rows: Array<{ entrantId: number; placement: number; sharedThrough: number }>): string[] {
    return rows.map((row) => `${row.entrantId}: ${row.placement === row.sharedThrough ? row.placement : `${row.placement}-${row.sharedThrough}`}`);
}

describe('resolveDivisionPlacements', () => {
    it('places a single-elimination bracket from its own matches', () => {
        const result = resolveDivisionPlacements(
            division(
                [
                    match(101, 200, [[1], [2]]),
                    match(102, 200, [[3], [4]]),
                    match(103, 200, [[1], [3]]),
                    pool(200, []),
                ],
                [edge(101, 103), edge(102, 103)],
                [entrant(1), entrant(2), entrant(3), entrant(4)],
            ),
        );

        expect(result.complete).toBe(true);
        expect(result.endings).toBe(1);
        expect(bands(result.rows)).toEqual(['1: 1', '3: 2', '2: 3-4', '4: 3-4']);
        expect(result.rows[2].exitName).toBe('Match 101');
    });

    it('places a pool whose matches are not chained through the pool itself', () => {
        const result = resolveDivisionPlacements(
            division(
                [
                    match(101, 200, [[1], [2]]),
                    match(102, 200, [[1], [3]]),
                    match(103, 200, [[2], [3]]),
                    pool(200, [[1], [2], [3]]),
                ],
                [],
                [entrant(1), entrant(2), entrant(3)],
            ),
        );

        expect(bands(result.rows)).toEqual(['1: 1', '2: 2', '3: 3']);
        expect(result.rows.map((row) => row.exitName)).toEqual(['Pool 200', 'Pool 200', 'Pool 200']);
    });

    it('carries the order across phases, so a pool that feeds another sits behind it', () => {
        const result = resolveDivisionPlacements(
            division(
                [
                    match(101, 200, [[1], [2]]),
                    match(102, 300, [[3], [4]]),
                    match(103, 400, [[1], [3]]),
                    pool(200, [[1], [2]]),
                    pool(300, [[3], [4]]),
                    pool(400, [[1], [3]]),
                ],
                [edge(200, 400, ['phase_group', 'phase_group']), edge(300, 400, ['phase_group', 'phase_group'])],
                [entrant(1), entrant(2), entrant(3), entrant(4)],
            ),
        );

        expect(bands(result.rows)).toEqual(['1: 1', '3: 2', '2: 3-4', '4: 3-4']);
    });

    it('keeps a tie the competition itself left tied', () => {
        const result = resolveDivisionPlacements(
            division([match(101, 200, [[1, 2]]), pool(200, [[1, 2]])], [], [entrant(1), entrant(2)]),
        );

        expect(bands(result.rows)).toEqual(['1: 1-2', '2: 1-2']);
    });

    it('reads a lone unchained match through its pool', () => {
        const result = resolveDivisionPlacements(
            division([match(101, 200, [[1], [2]]), pool(200, [[1], [2]])], [], [entrant(1), entrant(2)]),
        );

        expect(result.rows.map((row) => row.exitName)).toEqual(['Pool 200', 'Pool 200']);
    });

    it('reports a division that stops in more than one place', () => {
        const result = resolveDivisionPlacements(
            division([match(101, 200, [[1], [2]]), match(102, 300, [[3], [4]]), pool(200, []), pool(300, [])], [], [entrant(1), entrant(2), entrant(3), entrant(4)]),
        );

        expect(result.endings).toBe(2);
    });

    it('leaves out somebody no competition held', () => {
        const result = resolveDivisionPlacements(
            division([match(101, 200, [[1], [2]]), pool(200, [[1], [2]])], [], [entrant(1), entrant(2), entrant(3)]),
        );

        expect(result.rows.map((row) => row.entrantId)).toEqual([1, 2]);
    });

    it('says a division with an undecided match is not finished', () => {
        const result = resolveDivisionPlacements(
            division([match(101, 200, [[1], [2]]), match(102, 200, []), pool(200, [])], [edge(101, 102)], [entrant(1), entrant(2)]),
        );

        expect(result.complete).toBe(false);
    });

    it('names each step of the run by how far it sat from the end', () => {
        const result = resolveDivisionPlacements(
            division(
                [
                    match(101, 200, [[1], [2]]),
                    match(102, 200, [[3], [4]]),
                    match(103, 200, [[1], [3]]),
                    pool(200, []),
                ],
                [edge(101, 103), edge(102, 103)],
                [entrant(1), entrant(2), entrant(3), entrant(4)],
            ),
        );

        const champion = result.rows.find((row) => row.entrantId === 1);
        expect(champion?.run).toEqual([
            { label: 'SF', name: 'Match 101', won: true },
            { label: 'F', name: 'Match 103', won: true },
        ]);

        const beatenInTheSemi = result.rows.find((row) => row.entrantId === 4);
        expect(beatenInTheSemi?.run).toEqual([{ label: 'SF', name: 'Match 102', won: false }]);
    });

    it('answers a graph whose rules close a loop instead of never answering', () => {
        const result = resolveDivisionPlacements(
            division([match(101, 200, [[1], [2]]), match(102, 200, [[1], [3]]), pool(200, [])], [edge(101, 102), edge(102, 101)], [entrant(1), entrant(2), entrant(3)]),
        );

        expect(result.rows).toHaveLength(3);
    });
});
