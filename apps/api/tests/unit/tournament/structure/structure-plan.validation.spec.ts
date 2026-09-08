import type { PlanNode, PlanRoute, PlanSlot, StructurePlan } from '@tournament-hub/contracts';

import { orderedForWriting, validateStructurePlan } from '@tournament/structure/plan/structure-plan.validation';

function node(partial: Partial<PlanNode> & Pick<PlanNode, 'localId' | 'kind'>): PlanNode {
    return { action: 'create', name: partial.localId, ...partial };
}

function plan(nodes: PlanNode[], routes: PlanRoute[] = [], clearedSlots: PlanSlot[] = []): StructurePlan {
    return { tournamentId: 1, source: { kind: 'manual' }, basedOn: [], nodes, routes, clearedSlots };
}

const division = node({ localId: 'd', kind: 'division', name: 'Open' });
const phase = node({ localId: 'p', kind: 'phase', parentLocalId: 'd', name: 'Qualifiers' });
const pool = node({ localId: 'g', kind: 'phaseGroup', parentLocalId: 'p', name: 'Pool A' });
const match = node({ localId: 'm', kind: 'match', parentLocalId: 'g', name: 'Round 1' });

describe('validateStructurePlan', () => {
    it('accepts a division with a phase, a pool and a match under it', () => {
        expect(validateStructurePlan(plan([division, phase, pool, match]))).toEqual([]);
    });

    it('accepts a match that carries the people in it and the songs it is played on', () => {
        const seated = node({ localId: 'm', kind: 'match', parentLocalId: 'g', name: 'Round 1', entrantRowIds: [4, 5], songIds: [7] });

        expect(validateStructurePlan(plan([division, phase, pool, seated]))).toEqual([]);
    });

    it('refuses players or songs on anything but a match', () => {
        const seated = node({ localId: 'g', kind: 'phaseGroup', parentLocalId: 'p', name: 'Pool A', entrantRowIds: [4] });
        const errors = validateStructurePlan(plan([division, phase, seated]));

        expect(errors).toEqual([expect.stringContaining('cannot hold players or songs')]);
    });

    it('refuses two nodes under one local id', () => {
        const errors = validateStructurePlan(plan([division, node({ localId: 'd', kind: 'division', name: 'Again' })]));

        expect(errors).toEqual([expect.stringContaining('share the local id d')]);
    });

    it('refuses a node that hangs from something the plan does not carry', () => {
        const errors = validateStructurePlan(plan([node({ localId: 'p', kind: 'phase', parentLocalId: 'nowhere' })]));

        expect(errors).toEqual([expect.stringContaining('which the plan does not carry')]);
    });

    it('refuses a pool hanging from a division', () => {
        const errors = validateStructurePlan(plan([division, node({ localId: 'g', kind: 'phaseGroup', parentLocalId: 'd' })]));

        expect(errors).toEqual([expect.stringContaining('cannot hang from a division')]);
    });

    it('refuses a phase with nothing to hang from', () => {
        const errors = validateStructurePlan(plan([node({ localId: 'p', kind: 'phase' })]));

        expect(errors).toEqual([expect.stringContaining('has nothing to hang from')]);
    });

    it('refuses a link with no row and a creation with one', () => {
        const errors = validateStructurePlan(
            plan([
                node({ localId: 'a', kind: 'division', action: 'link' }),
                node({ localId: 'b', kind: 'division', action: 'create', localRowId: 7 }),
            ]),
        );

        expect(errors).toEqual([expect.stringContaining('links nothing'), expect.stringContaining('both creates and names')]);
    });

    it('asks a linked node for the name its row should have', () => {
        const errors = validateStructurePlan(plan([node({ localId: 'd', kind: 'division', action: 'link', localRowId: 4, name: '' })]));

        expect(errors).toEqual([expect.stringContaining('has no name')]);
    });

    it('asks a removed node for the row and not for a name', () => {
        const errors = validateStructurePlan(
            plan([
                node({ localId: 'a', kind: 'division', action: 'remove', localRowId: 4, name: '' }),
                node({ localId: 'b', kind: 'division', action: 'remove', name: '' }),
            ]),
        );

        expect(errors).toEqual([expect.stringContaining('b removes nothing')]);
    });

    it('refuses writing into something the plan leaves out', () => {
        const errors = validateStructurePlan(plan([{ ...division, action: 'skip' }, phase]));

        expect(errors).toEqual([expect.stringContaining('does not leave standing')]);
    });

    it('refuses writing into something the plan removes', () => {
        const errors = validateStructurePlan(plan([{ ...division, action: 'remove', localRowId: 4 }, phase]));

        expect(errors).toEqual([expect.stringContaining('does not leave standing')]);
    });

    it('refuses a route into something the plan removes', () => {
        const errors = validateStructurePlan(
            plan(
                [division, phase, pool, { ...match, action: 'remove', localRowId: 9 }],
                [{ sourceLocalId: 'g', sourcePlacement: 1, targetLocalId: 'm', targetSlot: 1 }],
            ),
        );

        expect(errors).toEqual([expect.stringContaining('does not leave one of them standing')]);
    });

    it('refuses a match that advances into itself', () => {
        const errors = validateStructurePlan(
            plan([division, phase, pool, match], [{ sourceLocalId: 'm', sourcePlacement: 1, targetLocalId: 'm', targetSlot: 1 }]),
        );

        expect(errors).toEqual([expect.stringContaining('cannot advance into itself')]);
    });

    it('refuses two routes claiming one slot', () => {
        const second = node({ localId: 'm2', kind: 'match', parentLocalId: 'g', name: 'Round 2' });
        const target = node({ localId: 'm3', kind: 'match', parentLocalId: 'g', name: 'Final' });
        const errors = validateStructurePlan(
            plan(
                [division, phase, pool, match, second, target],
                [
                    { sourceLocalId: 'm', sourcePlacement: 1, targetLocalId: 'm3', targetSlot: 1 },
                    { sourceLocalId: 'm2', sourcePlacement: 1, targetLocalId: 'm3', targetSlot: 1 },
                ],
            ),
        );

        expect(errors).toEqual([expect.stringContaining('Two routes claim slot 1')]);
    });

    it('refuses a route that joins something which does not advance', () => {
        const errors = validateStructurePlan(
            plan([division, phase, pool, match], [{ sourceLocalId: 'd', sourcePlacement: 1, targetLocalId: 'm', targetSlot: 1 }]),
        );

        expect(errors).toEqual([expect.stringContaining('only pools and matches advance')]);
    });

    it('refuses a place or a slot below one', () => {
        const second = node({ localId: 'm2', kind: 'match', parentLocalId: 'g' });
        const errors = validateStructurePlan(
            plan([division, phase, pool, match, second], [{ sourceLocalId: 'm', sourcePlacement: 0, targetLocalId: 'm2', targetSlot: 0 }]),
        );

        expect(errors).toEqual([expect.stringContaining('places start at one'), expect.stringContaining('slots start at one')]);
    });

    it('refuses emptying a slot on something the plan does not carry', () => {
        const errors = validateStructurePlan(plan([division, phase, pool], [], [{ targetLocalId: 'gone', targetSlot: 1 }]));

        expect(errors).toEqual([expect.stringContaining('which the plan does not carry')]);
    });

    it('refuses a slot that is both emptied and filled', () => {
        const second = node({ localId: 'm2', kind: 'match', parentLocalId: 'g', name: 'Round 2' });
        const errors = validateStructurePlan(
            plan(
                [division, phase, pool, match, second],
                [{ sourceLocalId: 'm', sourcePlacement: 1, targetLocalId: 'm2', targetSlot: 1 }],
                [{ targetLocalId: 'm2', targetSlot: 1 }],
            ),
        );

        expect(errors).toEqual([expect.stringContaining('both emptied and filled')]);
    });
});

describe('orderedForWriting', () => {
    it('writes a node after whatever it hangs from, whatever order it arrived in', () => {
        const ordering = orderedForWriting(plan([match, pool, phase, division]));

        expect(ordering.errors).toEqual([]);
        expect(ordering.nodes.map((candidate) => candidate.localId)).toEqual(['d', 'p', 'g', 'm']);
    });

    it('reports a parent cycle instead of following it', () => {
        const ordering = orderedForWriting(
            plan([node({ localId: 'a', kind: 'phase', parentLocalId: 'b' }), node({ localId: 'b', kind: 'phase', parentLocalId: 'a' })]),
        );

        expect(ordering.errors).toEqual([expect.stringContaining('hangs from itself')]);
    });
});
