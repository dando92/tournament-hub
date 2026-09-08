import assert from 'node:assert/strict';
import test from 'node:test';

import { BracketGeneratorProvider, BRACKET_TYPES, bracketTypeLabel, DoubleElimination, Manual, SingleElimination } from '../../dist/index.js';

function assertWellFormed(plan) {
    const localIds = new Set(plan.matches.map((match) => match.localId));
    assert.equal(localIds.size, plan.matches.length, 'match identifiers are unique');

    const claimed = new Set();
    for (const route of plan.routes) {
        assert.ok(localIds.has(route.sourceMatchLocalId), `route source ${route.sourceMatchLocalId} exists`);
        assert.ok(localIds.has(route.targetMatchLocalId), `route target ${route.targetMatchLocalId} exists`);
        assert.notEqual(route.sourceMatchLocalId, route.targetMatchLocalId, 'a route never feeds its own source');
        assert.ok(route.sourcePlacement >= 1, 'placements are one-based');
        assert.ok(route.targetSlot >= 1 && route.targetSlot <= plan.playerPerMatch, 'a slot is within the match');

        const key = `${route.targetMatchLocalId}#${route.targetSlot}`;
        assert.ok(!claimed.has(key), `slot ${key} is claimed once`);
        claimed.add(key);
    }

    const seated = new Set();
    for (const seat of plan.seats) {
        assert.ok(localIds.has(seat.matchLocalId), 'a seat belongs to a match in the plan');
        const key = `${seat.matchLocalId}#${seat.slot}`;
        assert.ok(!claimed.has(key), `seat ${key} does not collide with a route`);
        assert.ok(!seated.has(key), `seat ${key} is taken once`);
        seated.add(key);
    }

    const seeds = plan.seats.map((seat) => seat.seedIndex);
    assert.equal(new Set(seeds).size, seeds.length, 'no entrant is seated twice');
}

test('single elimination of eight names the rounds people use', () => {
    const plan = new SingleElimination().generate({ entrantCount: 8, playerPerMatch: 2 });

    assert.equal(plan.matches.length, 7);
    assert.equal(plan.byes, 0);
    assert.deepEqual(
        plan.matches.map((match) => match.name),
        ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4', 'Semifinal 1', 'Semifinal 2', 'Grand Final'],
    );
    assert.equal(plan.routes.length, 6);
    assert.equal(plan.seats.length, 8);
    assertWellFormed(plan);
});

test('single elimination seats the entrants in seeding order and leaves byes empty', () => {
    const plan = new SingleElimination().generate({ entrantCount: 5, playerPerMatch: 2 });

    assert.equal(plan.byes, 3);
    assert.equal(plan.seats.length, 5);
    assert.deepEqual(
        plan.seats.map((seat) => [seat.seedIndex, seat.slot]),
        [
            [0, 1],
            [1, 2],
            [2, 1],
            [3, 2],
            [4, 1],
        ],
    );
    assertWellFormed(plan);
});

test('single elimination gives a four-player match two finals', () => {
    const plan = new SingleElimination().generate({ entrantCount: 16, playerPerMatch: 4 });

    const finals = plan.matches.filter((match) => match.round === 'Finals');
    assert.deepEqual(
        finals.map((match) => match.name),
        ['Final 1', 'Final 2'],
    );
    assertWellFormed(plan);
});

test('double elimination wires both sides into one grand final', () => {
    const plan = new DoubleElimination().generate({ entrantCount: 8, playerPerMatch: 2 });

    assert.equal(plan.matches.length, 14);
    const grandFinal = plan.matches.at(-1);
    assert.equal(grandFinal.name, 'Grand Final');

    const intoFinal = plan.routes.filter((route) => route.targetMatchLocalId === grandFinal.localId);
    assert.equal(intoFinal.length, 2, 'the winners side and the losers side each fill one slot');
    assert.deepEqual(
        intoFinal.map((route) => route.targetSlot).sort(),
        [1, 2],
    );
    assertWellFormed(plan);
});

test('double elimination refuses a match size it cannot pair', () => {
    assert.throws(() => new DoubleElimination().generate({ entrantCount: 8, playerPerMatch: 3 }), /2, 4 or 8/);
});

test('a manual phase is one round and routes nowhere', () => {
    const plan = new Manual().generate({ entrantCount: 8, playerPerMatch: 4 });

    assert.deepEqual(
        plan.matches.map((match) => match.name),
        ['Match 1', 'Match 2'],
    );
    assert.equal(plan.routes.length, 0);
    assert.equal(plan.seats.length, 8);
    assertWellFormed(plan);
});

test('a caller can name the matches itself', () => {
    const plan = new SingleElimination().generate({
        entrantCount: 4,
        playerPerMatch: 2,
        name: (descriptor) => `R${descriptor.roundIndex + 1}M${descriptor.matchIndex + 1}`,
    });

    assert.deepEqual(
        plan.matches.map((match) => match.name),
        ['R1M1', 'R1M2', 'R2M1'],
    );
});

test('the catalogue offers only shapes that build something', () => {
    const provider = new BracketGeneratorProvider();

    assert.deepEqual(provider.getAll(), ['SingleElimination', 'DoubleElimination', 'Manual']);
    assert.deepEqual([...BRACKET_TYPES].sort(), provider.getAll().sort());
    assert.equal(provider.getGenerator('KingOfTheHill'), undefined);
    assert.equal(bracketTypeLabel('Manual'), 'First phase only');

    for (const type of provider.getAll()) {
        const plan = provider.getGenerator(type).generate({ entrantCount: 8, playerPerMatch: 2 });
        assert.ok(plan.matches.length > 0, `${type} builds at least one match`);
        assertWellFormed(plan);
    }
});
