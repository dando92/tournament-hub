import test from 'node:test';
import assert from 'node:assert/strict';

import { byMatchStanding, matchPointsOf } from '../../src/features/match/model/matchPoints.ts';
import type { Match } from '../../src/features/match/model/types.ts';

type RoundPoints = Record<number, number>;

function player(id: number) {
    return { id, playerName: `Player ${id}` };
}

function match(rounds: RoundPoints[], resultState: Match['resultState'], matchResult: Match['matchResult'] = null): Match {
    return {
        id: 1,
        name: 'Match',
        subtitle: '',
        notes: '',
        scoringSystem: 'PlacementPointsWithFailZero',
        active: false,
        entrants: [1, 2, 3].map((id) => ({
            id,
            name: `Player ${id}`,
            type: 'player',
            status: 'active',
            participants: [{ id, roles: ['player'], status: 'active', player: player(id) }],
        })),
        rounds: rounds.map((points, index) => ({
            id: index + 1,
            song: { id: index + 1, title: `Song ${index + 1}` },
            standings: Object.entries(points).map(([playerId, awarded], standingIndex) => ({
                id: index * 10 + standingIndex,
                points: awarded,
                player: player(Number(playerId)),
                score: { id: index * 10 + standingIndex, percentage: 90, isFailed: false },
            })),
        })),
        tiebreaks: [],
        advancementRules: [],
        resultState,
        matchResult,
        phaseGroupId: 1,
    };
}

const openMatch = match(
    [{ 1: 3, 2: 2, 3: 1 }, { 1: 0, 2: 3 }],
    { status: 'incomplete', entries: [], ambiguousTies: [] },
);

test('totals the rounds played so far while the match is still open', () => {
    assert.equal(matchPointsOf(openMatch, 1), 3);
    assert.equal(matchPointsOf(openMatch, 2), 5);
    assert.equal(matchPointsOf(openMatch, 3), 1);
});

test('answers with the frozen points once the match is committed', () => {
    const committed = match(
        [{ 1: 3, 2: 2, 3: 1 }],
        { status: 'completed', entries: [], ambiguousTies: [] },
        { id: 1, playerPoints: [{ playerId: 1, points: 7, placement: 1 }] },
    );

    assert.equal(matchPointsOf(committed, 1), 7);
});

test('orders an open match by its running points', () => {
    const ordered = [player(1), player(2), player(3)].sort(byMatchStanding(openMatch));

    assert.deepEqual(ordered.map((entry) => entry.id), [2, 1, 3]);
});

test('keeps the resolved order once the server has one', () => {
    const resolved = match([{ 1: 3, 2: 2, 3: 1 }], {
        status: 'ready',
        entries: [
            { playerId: 3, points: 1, placement: 1 },
            { playerId: 1, points: 3, placement: 2 },
            { playerId: 2, points: 2, placement: 3 },
        ],
        ambiguousTies: [],
    });
    const ordered = [player(1), player(2), player(3)].sort(byMatchStanding(resolved));

    assert.deepEqual(ordered.map((entry) => entry.id), [3, 1, 2]);
});
