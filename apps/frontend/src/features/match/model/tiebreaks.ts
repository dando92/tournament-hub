import type { MatchPlacementTieDto, MatchTiebreakDto } from '@tournament-hub/contracts';
import type { Match } from '@/features/match/model/types';

export function isTiebreakSettled(tiebreak: MatchTiebreakDto): boolean {
    const standings = tiebreak.standings ?? [];
    if (standings.length < 2) {
        return false;
    }

    return tiebreak.song
        ? standings.every((standing) => Boolean(standing.score))
        : standings.some((standing) => (standing.manualPoints ?? 0) > 0);
}

function sameIds(left: number[], right: number[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    const ids = new Set(right);

    return left.every((id) => ids.has(id));
}

export function openTies(match: Match): MatchPlacementTieDto[] {
    const attempts = (match.tiebreaks ?? []).filter((tiebreak) => !tiebreak.invalidated);

    return match.resultState.ambiguousTies.filter(
        (tie) => !attempts.some((attempt) => sameIds(attempt.standings.map((standing) => standing.player.id), tie.playerIds)),
    );
}

export function canCreateTiebreak(match: Match): boolean {
    if (openTies(match).length === 0) {
        return false;
    }

    return !(match.tiebreaks ?? []).some((tiebreak) => !tiebreak.invalidated && !isTiebreakSettled(tiebreak));
}
