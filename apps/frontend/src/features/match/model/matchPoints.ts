import type { Match } from '@/features/match/model/types';

export function matchPointsOf(match: Match, playerId: number): number {
    const committed = match.matchResult?.playerPoints?.find((entry) => entry.playerId === playerId)?.points;
    if (committed !== undefined) {
        return committed;
    }

    return (match.rounds ?? []).reduce((total, round) => {
        const standing = (round.standings ?? []).find((candidate) => candidate.player.id === playerId);

        return total + (standing?.points ?? 0);
    }, 0);
}

export function byMatchStanding<T extends { id: number }>(match: Match): (left: T, right: T) => number {
    const resolvedOrder = new Map(match.resultState.entries.map((entry, index) => [entry.playerId, index]));
    const placeOf = (playerId: number) => resolvedOrder.get(playerId) ?? Number.MAX_SAFE_INTEGER;

    return (left, right) =>
        placeOf(left.id) - placeOf(right.id) || matchPointsOf(match, right.id) - matchPointsOf(match, left.id) || left.id - right.id;
}
