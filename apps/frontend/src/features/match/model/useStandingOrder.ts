import { useRef } from 'react';
import type { Match } from '@/features/match/model/types';
import type { Player } from '@/features/participant/model/types';
import { byMatchStanding } from '@/features/match/model/matchPoints';

export function useStandingOrder(match: Match, players: Player[]): Player[] {
    const roster = players.map((player) => player.id).sort((left, right) => left - right).join('-');
    const stamp = `${roster}|${match.matchResult ? 'committed' : 'open'}`;
    const frozen = useRef<{ stamp: string; order: number[] }>({ stamp: '', order: [] });

    if (frozen.current.stamp !== stamp) {
        frozen.current = { stamp, order: [...players].sort(byMatchStanding(match)).map((player) => player.id) };
    }

    const rank = new Map(frozen.current.order.map((playerId, index) => [playerId, index]));

    return [...players].sort((left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0));
}
