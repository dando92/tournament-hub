export type PoolTotal = {
    entrantId: number;
    points: number;
};

export function poolTotals(matches: PoolTotal[][]): PoolTotal[] {
    const totals = new Map<number, number>();

    for (const match of matches) {
        for (const entry of match) {
            totals.set(entry.entrantId, (totals.get(entry.entrantId) ?? 0) + entry.points);
        }
    }

    return [...totals.entries()]
        .map(([entrantId, points]) => ({ entrantId, points }))
        .sort((left, right) => right.points - left.points || left.entrantId - right.entrantId);
}
