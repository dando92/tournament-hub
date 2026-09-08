import { Entrant, Match, MatchResult, Phase, PhaseGroup, PhaseGroupEntrant, Player } from '@tournament-hub/persistence';
import { PhaseGroupAggregate } from '@tournament/structure/phase-group/phase-group.aggregate';

function phase(phaseGroups: Array<Partial<PhaseGroup>> = []): Phase {
  return { id: 5, name: 'Qualifiers', phaseGroups, division: { id: 4, tournament: { id: 3 } } } as Phase;
}

function entrant(id: number, name = `Entrant ${id}`): Entrant {
  return { id, name, type: 'player', status: 'active' } as Entrant;
}

function seat(entrantId: number, overrides: Partial<PhaseGroupEntrant> = {}): PhaseGroupEntrant {
  return {
    id: entrantId + 900,
    entrant: entrant(entrantId),
    slot: 1,
    seedNum: 1,
    status: 'active',
    ...overrides,
  } as PhaseGroupEntrant;
}

function pool(overrides: Partial<PhaseGroup> = {}): PhaseGroupAggregate {
  return PhaseGroupAggregate.of({
    id: 7,
    name: 'A',
    state: 'active',
    phase: phase(),
    entrants: [],
    matches: [],
    ...overrides,
  } as PhaseGroup);
}

function decidedMatch(id: number, points: Array<{ entrant: Entrant; points: number }>): Match {
  return {
    id,
    entrants: points.map(({ entrant: each }, index) => ({
      ...each,
      participants: [{ player: { id: each.id * 100 + index } as Player }],
    })),
    matchResult: {
      playerPoints: points.map(({ entrant: each, points: earned }, index) => ({ playerId: each.id * 100 + index, points: earned })),
    } as MatchResult,
  } as Match;
}

describe('PhaseGroupAggregate.create', () => {
  it('calls the pool a phase starts with nothing more than Pool', () => {
    const created = PhaseGroupAggregate.create({}, phase());

    expect(created.entity.displayIdentifier).toBe('Pool');
    expect(created.entity.name).toBe('Pool');
    expect(created.entity.state).toBe('pending');
  });

  it('numbers the pools that follow it, starting at the second', () => {
    const created = PhaseGroupAggregate.create({}, phase([{ displayIdentifier: 'Pool' }]));

    expect(created.entity.displayIdentifier).toBe('Pool 2');
    expect(created.entity.name).toBe('Pool 2');
  });

  it('passes over a number somebody has already given a pool', () => {
    const created = PhaseGroupAggregate.create(
      {},
      phase([{ displayIdentifier: 'Pool' }, { name: 'Pool 3', displayIdentifier: 'Pool 3' }]),
    );

    expect(created.entity.displayIdentifier).toBe('Pool 4');
  });

  it('keeps an explicit identifier and name, so a start.gg import stays faithful', () => {
    const created = PhaseGroupAggregate.create({ name: 'Pool 12', displayIdentifier: 'L' }, phase());

    expect(created.entity.displayIdentifier).toBe('L');
    expect(created.entity.name).toBe('Pool 12');
  });

  it('carries the address its events are routed by', () => {
    const created = PhaseGroupAggregate.create({}, phase());

    expect(created.phaseAddress).toEqual({ tournamentId: 3, divisionId: 4, phaseId: 5 });
  });
});

describe('PhaseGroupAggregate.describe', () => {
  it('ignores a state that is not one a pool can be in', () => {
    const aggregate = pool();

    aggregate.describe({ state: 'nonsense' });

    expect(aggregate.entity.state).toBe('active');
  });

  it('takes the states a pool can be in', () => {
    const aggregate = pool();

    aggregate.describe({ state: 'completed' });

    expect(aggregate.entity.state).toBe('completed');
  });
});

describe('PhaseGroupAggregate.seat', () => {
  it('numbers the seats in the order the entrants are given', () => {
    const aggregate = pool();

    aggregate.seat([entrant(11), entrant(12)]);

    expect(aggregate.entity.entrants.map((each) => [each.entrant.id, each.slot, each.seedNum])).toEqual([
      [11, 1, 1],
      [12, 2, 2],
    ]);
  });

  it('keeps the row somebody already had, and with it the rule that seated them', () => {
    const existing = seat(11, { slot: 4, seedNum: 4, sourceAdvancementRule: { id: 2 } as PhaseGroupEntrant['sourceAdvancementRule'] });
    const aggregate = pool({ entrants: [existing] });

    aggregate.seat([entrant(11)]);

    expect(aggregate.entity.entrants).toHaveLength(1);
    expect(aggregate.entity.entrants[0]).toBe(existing);
    expect(existing.slot).toBe(1);
    expect(existing.sourceAdvancementRule).toEqual({ id: 2 });
    expect(aggregate.removals).toEqual([]);
  });

  it('releases the seat of somebody the new seating does not name', () => {
    const aggregate = pool({ entrants: [seat(11), seat(12)] });

    aggregate.seat([entrant(11)]);

    expect(aggregate.entity.entrants.map((each) => each.entrant.id)).toEqual([11]);
    expect(aggregate.removals).toEqual([912]);
  });
});

describe('PhaseGroupAggregate.place', () => {
  it('takes the slot the rule names', () => {
    const aggregate = pool();

    aggregate.place({ entrant: entrant(11), slot: 3, sourceAdvancementRuleId: 50 });

    expect(aggregate.entity.entrants[0]).toEqual(expect.objectContaining({ slot: 3, seedNum: 3, status: 'active' }));
    expect(aggregate.entity.entrants[0].sourceAdvancementRule).toEqual({ id: 50 });
  });

  it('takes the next free slot when the rule names none', () => {
    const aggregate = pool({ entrants: [seat(11, { slot: 2 })] });

    aggregate.place({ entrant: entrant(12), slot: null });

    expect(aggregate.entity.entrants[1].slot).toBe(3);
  });

  it('reactivates the seat somebody already had instead of adding a second one', () => {
    const aggregate = pool({ entrants: [seat(11, { slot: 2, status: 'eliminated' })] });

    aggregate.place({ entrant: entrant(11), slot: null });

    expect(aggregate.entity.entrants).toHaveLength(1);
    expect(aggregate.entity.entrants[0]).toEqual(expect.objectContaining({ slot: 2, status: 'active' }));
  });
});

describe('PhaseGroupAggregate.release', () => {
  it('drops the seat and tells the store to delete its row', () => {
    const aggregate = pool({ entrants: [seat(11), seat(12)] });

    aggregate.release(11);

    expect(aggregate.entity.entrants.map((each) => each.entrant.id)).toEqual([12]);
    expect(aggregate.removals).toEqual([911]);
  });

  it('does nothing for somebody who has no seat here', () => {
    const aggregate = pool({ entrants: [seat(11)] });

    aggregate.release(99);

    expect(aggregate.entity.entrants).toHaveLength(1);
    expect(aggregate.removals).toEqual([]);
  });
});

describe('PhaseGroupAggregate.markAdvanced', () => {
  it('advances who the rules moved on and returns everybody else to competing', () => {
    const aggregate = pool({ entrants: [seat(11), seat(12, { status: 'advanced' }), seat(13, { status: 'eliminated' })] });

    aggregate.markAdvanced([11]);

    expect(aggregate.entity.entrants.map((each) => each.status)).toEqual(['advanced', 'active', 'eliminated']);
  });
});

describe('PhaseGroupAggregate.isDecided', () => {
  it('is false for a pool with no matches at all', () => {
    expect(pool().isDecided).toBe(false);
  });

  it('is false while one match is still open', () => {
    const aggregate = pool({ matches: [decidedMatch(1, []), { id: 2, matchResult: null } as Match] });

    expect(aggregate.isDecided).toBe(false);
  });

  it('is true once every match has a result', () => {
    const aggregate = pool({ matches: [decidedMatch(1, []), decidedMatch(2, [])] });

    expect(aggregate.isDecided).toBe(true);
  });
});

describe('PhaseGroupAggregate.placements', () => {
  it('orders the entrants by the points their matches gave them', () => {
    const first = entrant(11);
    const second = entrant(12);
    const aggregate = pool({
      matches: [
        decidedMatch(1, [{ entrant: first, points: 1 }, { entrant: second, points: 3 }]),
        decidedMatch(2, [{ entrant: first, points: 1 }, { entrant: second, points: 3 }]),
      ],
    });

    expect(aggregate.placements.map((each) => each.id)).toEqual([12, 11]);
  });
});
