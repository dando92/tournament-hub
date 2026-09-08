import { AdvancementRouting, resolvePlacements, TiebreakPlacementInput } from "@match/placement.resolver";

function rule(sourcePlacement: number, targetId: number, targetSlot = sourcePlacement): AdvancementRouting {
    return {
        sourceKind: "match",
        sourceId: 10,
        sourcePlacement,
        targetKind: "match",
        targetId,
        targetSlot,
    };
}

function attempt(
    sequence: number,
    entries: Array<{ playerId: number; value: number; isFailed?: boolean }>,
): TiebreakPlacementInput {
    return {
        id: sequence,
        sequence,
        invalidated: false,
        complete: true,
        entries: entries.map((entry) => ({ ...entry, isFailed: entry.isFailed ?? null })),
    };
}

describe("resolvePlacements", () => {
    const tied = [
        { playerId: 1, points: 6 },
        { playerId: 2, points: 6 },
        { playerId: 3, points: 4 },
    ];

    it("keeps shared placement when the tie has no different advancement outcome", () => {
        const result = resolvePlacements(tied, [], []);

        expect(result.ambiguousTies).toEqual([]);
        expect(result.entries).toEqual([
            { playerId: 1, points: 6, placement: 1 },
            { playerId: 2, points: 6, placement: 1 },
            { playerId: 3, points: 4, placement: 3 },
        ]);
    });

    it("requires a tiebreak across different advancement destinations", () => {
        const result = resolvePlacements(tied, [], [rule(1, 20), rule(2, 30)]);

        expect(result.ambiguousTies).toEqual([{ playerIds: [1, 2], fromPlacement: 1, toPlacement: 2 }]);
    });

    it("uses a completed attempt only to split its tied group", () => {
        const result = resolvePlacements(tied, [attempt(1, [
            { playerId: 1, value: 96.4 },
            { playerId: 2, value: 97.2 },
        ])], [rule(1, 20), rule(2, 30)]);

        expect(result.ambiguousTies).toEqual([]);
        expect(result.entries.map(({ playerId, points, placement }) => ({ playerId, points, placement }))).toEqual([
            { playerId: 2, points: 6, placement: 1 },
            { playerId: 1, points: 6, placement: 2 },
            { playerId: 3, points: 4, placement: 3 },
        ]);
    });

    it("allows a later attempt to split the subgroup an earlier attempt left tied", () => {
        const points = [
            { playerId: 1, points: 6 },
            { playerId: 2, points: 6 },
            { playerId: 3, points: 6 },
        ];
        const result = resolvePlacements(points, [
            attempt(1, [
                { playerId: 1, value: 99 },
                { playerId: 2, value: 98 },
                { playerId: 3, value: 98 },
            ]),
            attempt(2, [
                { playerId: 2, value: 97 },
                { playerId: 3, value: 98 },
            ]),
        ], [rule(1, 20), rule(2, 30), rule(3, 40)]);

        expect(result.ambiguousTies).toEqual([]);
        expect(result.entries.map((entry) => entry.playerId)).toEqual([1, 3, 2]);
    });

    it("ranks a non-failed played result before a failed one", () => {
        const result = resolvePlacements(tied, [attempt(1, [
            { playerId: 1, value: 99, isFailed: true },
            { playerId: 2, value: 90, isFailed: false },
        ])], [rule(1, 20), rule(2, 30)]);

        expect(result.entries.map((entry) => entry.playerId)).toEqual([2, 1, 3]);
    });

    describe("with the averages of the match", () => {
        const averaged = [
            { playerId: 1, points: 6, averagePercentage: 92.5 },
            { playerId: 2, points: 6, averagePercentage: 95.25 },
            { playerId: 3, points: 4, averagePercentage: 80 },
        ];

        it("separates a tie no rule distinguishes", () => {
            const result = resolvePlacements(averaged, [], []);

            expect(result.ambiguousTies).toEqual([]);
            expect(result.entries).toEqual([
                { playerId: 2, points: 6, placement: 1 },
                { playerId: 1, points: 6, placement: 2 },
                { playerId: 3, points: 4, placement: 3 },
            ]);
        });

        it("leaves the tie that decides an advancement to a played tiebreak", () => {
            const result = resolvePlacements(averaged, [], [rule(1, 20), rule(2, 30)]);

            expect(result.ambiguousTies).toEqual([{ playerIds: [1, 2], fromPlacement: 1, toPlacement: 2 }]);
            expect(result.entries.map((entry) => entry.placement)).toEqual([1, 1, 3]);
        });

        it("separates a tie whose positions lead to the same place", () => {
            const result = resolvePlacements(averaged, [], [rule(1, 20, 1), rule(2, 20, 1)]);

            expect(result.ambiguousTies).toEqual([]);
            expect(result.entries.map((entry) => entry.playerId)).toEqual([2, 1, 3]);
        });

        it("keeps the group tied when one of them has nothing to average", () => {
            const result = resolvePlacements([
                { playerId: 1, points: 6, averagePercentage: 92.5 },
                { playerId: 2, points: 6, averagePercentage: null },
            ], [], []);

            expect(result.entries.map((entry) => entry.placement)).toEqual([1, 1]);
        });

        it("keeps the group tied when the averages agree", () => {
            const result = resolvePlacements([
                { playerId: 1, points: 6, averagePercentage: (90.13 + 95.27) / 2 },
                { playerId: 2, points: 6, averagePercentage: (95.27 + 90.13) / 2 },
            ], [], []);

            expect(result.entries.map((entry) => entry.placement)).toEqual([1, 1]);
        });

        it("orders the entries by placement, which is how a rule reads them", () => {
            const result = resolvePlacements([
                { playerId: 7, points: 2, averagePercentage: 70 },
                { playerId: 8, points: 6, averagePercentage: 91 },
                { playerId: 9, points: 6, averagePercentage: 94 },
            ], [], []);

            expect(result.entries.map((entry) => entry.playerId)).toEqual([9, 8, 7]);
        });
    });
});
