import { AdvancementRule, Entrant, Match, MatchResult, Phase, PhaseGroup, PhaseGroupEntrant, Player } from '@tournament-hub/persistence';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { AdvancementRuleStore } from '@tournament/structure/advancement/advancement-rule.store';
import { PhaseGroupAggregate } from '@tournament/structure/phase-group/phase-group.aggregate';
import { PhaseGroupStore } from '@tournament/structure/phase-group/phase-group.store';

import { AdvancementRunner } from '@tournament/structure/advancement/advancement.runner';
import { MatchAggregate } from '@match/match.aggregate';
import { ScoringSystemProvider } from '@tournament-hub/scoring';
import { MatchStore } from '@match/match.store';
import { ScheduleRunner } from '@tournament/competition/schedule/schedule.runner';

function entrant(id: number, playerId: number): Entrant {
  return {
    id,
    name: `Entrant ${id}`,
    type: 'player',
    participants: [{ player: { id: playerId } as Player }],
  } as Entrant;
}

function completedMatch(id: number, entrants: Entrant[], playerPoints: Array<{ playerId: number; points: number }>): Match {
  return {
    id,
    entrants,
    phaseGroup: { id: 30 },
    matchResult: { id: id + 1000, playerPoints } as MatchResult,
  } as Match;
}

function pool(id: number, matches: Match[] = [], seats: PhaseGroupEntrant[] = []): PhaseGroupAggregate {
  return PhaseGroupAggregate.of({
    id,
    state: 'active',
    matches,
    entrants: seats,
    phase: { id: 5, division: { id: 4, tournament: { id: 3 } } } as Phase,
  } as PhaseGroup);
}

function seat(entrantId: number, slot: number): PhaseGroupEntrant {
  return { id: entrantId + 900, entrant: { id: entrantId }, slot, seedNum: slot, status: 'active' } as PhaseGroupEntrant;
}

function rule(overrides: Partial<AdvancementRule>): AdvancementRule {
  return {
    id: 1,
    sourceKind: 'match',
    sourceId: 10,
    sourcePlacement: 1,
    targetKind: 'match',
    targetId: 20,
    targetSlot: 1,
    ...overrides,
  } as AdvancementRule;
}

describe('AdvancementRunner', () => {
  const matchStore = {
    load: jest.fn(),
    save: jest.fn(),
  };
  const advancementRuleService = {
    findBySource: jest.fn(),
  };
  const phaseGroupStore = {
    load: jest.fn(),
    save: jest.fn(),
  };
  const publisher = {
    emitMatchUpdate: jest.fn(),
    emitPhaseGroupUpdate: jest.fn(),
  };
  const controlRoom = {
    recalculateForMatch: jest.fn(),
  };

  const manager = new AdvancementRunner(
    matchStore as unknown as MatchStore,
    advancementRuleService as unknown as AdvancementRuleStore,
    phaseGroupStore as unknown as PhaseGroupStore,
    publisher as unknown as UiUpdatePublisher,
    { getScoringSystem: () => ({ recalc: jest.fn() }) } as unknown as ScoringSystemProvider,
    controlRoom as unknown as ScheduleRunner,
  );

  function savedEntrantIds(call: number): number[] {
    const saved = matchStore.save.mock.calls[call][0] as MatchAggregate;

    return saved.entrants.map((each) => each.id);
  }

  function savedPool(id: number): PhaseGroup {
    const saved = phaseGroupStore.save.mock.calls
      .map(([aggregate]) => aggregate as PhaseGroupAggregate)
      .find((aggregate) => aggregate.id === id);
    expect(saved).toBeDefined();

    return saved.entity;
  }

  function poolsAre(...aggregates: PhaseGroupAggregate[]): void {
    const byId = new Map(aggregates.map((aggregate) => [aggregate.id, aggregate]));
    phaseGroupStore.load.mockImplementation(async (id: number) => byId.get(id) ?? null);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    advancementRuleService.findBySource.mockResolvedValue([]);
    phaseGroupStore.load.mockResolvedValue(null);
  });

  it('places result entrants into the slots their rules name', async () => {
    const winner = entrant(1, 101);
    const runnerUp = entrant(2, 102);
    const alreadyThere = entrant(3, 103);
    const source = MatchAggregate.of(completedMatch(10, [runnerUp, winner], [
      { playerId: 101, points: 3 },
      { playerId: 102, points: 1 },
    ]));
    advancementRuleService.findBySource.mockImplementation((sourceKind: string) =>
      Promise.resolve(sourceKind === 'match'
        ? [rule({ id: 11, sourcePlacement: 1, targetSlot: 2 }), rule({ id: 12, sourcePlacement: 2, targetSlot: 1 })]
        : []),
    );
    matchStore.load.mockImplementation(() =>
      Promise.resolve(MatchAggregate.of({ id: 20, entrants: [alreadyThere], phaseGroup: { id: 31 } } as Match)),
    );

    await manager.advanceFromMatch(source);

    expect(savedEntrantIds(0)).toEqual([alreadyThere.id, winner.id]);
    expect(savedEntrantIds(1)).toEqual([runnerUp.id, alreadyThere.id]);
    expect(publisher.emitMatchUpdate).toHaveBeenCalledTimes(2);
    expect(publisher.emitPhaseGroupUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate an entrant already present in a target match', async () => {
    const winner = entrant(1, 101);
    const alreadyThere = entrant(3, 103);
    const source = MatchAggregate.of(completedMatch(10, [winner], [{ playerId: 101, points: 3 }]));
    advancementRuleService.findBySource.mockImplementation((sourceKind: string) =>
      Promise.resolve(sourceKind === 'match' ? [rule({ targetSlot: 2 })] : []),
    );
    matchStore.load.mockResolvedValue(
      MatchAggregate.of({ id: 20, entrants: [winner, alreadyThere], phaseGroup: { id: 31 } } as Match),
    );

    await manager.advanceFromMatch(source);

    expect(savedEntrantIds(0)).toEqual([alreadyThere.id, winner.id]);
  });

  it('completes a phase group only after every match in it has a result', async () => {
    const firstEntrant = entrant(1, 101);
    const secondEntrant = entrant(2, 102);
    const firstMatch = completedMatch(10, [firstEntrant, secondEntrant], [
      { playerId: 101, points: 3 },
      { playerId: 102, points: 1 },
    ]);
    const secondMatch = completedMatch(11, [firstEntrant, secondEntrant], [
      { playerId: 101, points: 0 },
      { playerId: 102, points: 2 },
    ]);
    advancementRuleService.findBySource.mockImplementation((sourceKind: string) =>
      Promise.resolve(sourceKind === 'phase_group'
        ? [rule({ id: 50, sourceKind: 'phase_group', sourceId: 30, targetKind: 'phase_group', targetId: 40 })]
        : []),
    );
    poolsAre(pool(30, [firstMatch, secondMatch], [seat(firstEntrant.id, 1)]), pool(40));

    await manager.advanceFromMatch(MatchAggregate.of(firstMatch));

    expect(savedPool(40).entrants).toEqual([
      expect.objectContaining({
        entrant: firstEntrant,
        slot: 1,
        seedNum: 1,
        status: 'active',
        sourceAdvancementRule: { id: 50 },
      }),
    ]);
    expect(savedPool(30).state).toBe('completed');
    expect(savedPool(30).entrants[0].status).toBe('advanced');
  });

  it('leaves a phase group active while any match result is missing', async () => {
    const only = entrant(1, 101);
    const source = completedMatch(10, [only], [{ playerId: 101, points: 1 }]);
    poolsAre(pool(30, [source, { id: 11, matchResult: null } as Match]));

    await manager.advanceFromMatch(MatchAggregate.of(source));

    expect(phaseGroupStore.save).not.toHaveBeenCalled();
  });

  it('removes previously advanced entrants and reopens their phase group', async () => {
    const winner = entrant(1, 101);
    const source = completedMatch(10, [winner], [{ playerId: 101, points: 1 }]);
    const matchRule = rule({ targetKind: 'match', targetId: 20 });
    const phaseGroupRule = rule({
      id: 2,
      sourceKind: 'phase_group',
      sourceId: 30,
      targetKind: 'phase_group',
      targetId: 40,
    });
    advancementRuleService.findBySource.mockImplementation((sourceKind: string) =>
      Promise.resolve(sourceKind === 'phase_group' ? [phaseGroupRule] : [matchRule]),
    );
    matchStore.load.mockResolvedValue(
      MatchAggregate.of({ id: 20, entrants: [winner], phaseGroup: { id: 31 } } as Match),
    );
    poolsAre(pool(30, [source], [seat(winner.id, 1)]), pool(40, [], [seat(winner.id, 1)]));

    await manager.revertFromMatch(MatchAggregate.of(source));

    expect(savedEntrantIds(0)).toEqual([]);
    expect(savedPool(40).entrants).toEqual([]);
    expect(savedPool(30).state).toBe('active');
    expect(savedPool(30).entrants[0].status).toBe('active');
  });

  it('loads a target pool once however many rules point at it', async () => {
    const winner = entrant(1, 101);
    const runnerUp = entrant(2, 102);
    const source = completedMatch(10, [winner, runnerUp], [
      { playerId: 101, points: 3 },
      { playerId: 102, points: 1 },
    ]);
    advancementRuleService.findBySource.mockImplementation((sourceKind: string) =>
      Promise.resolve(sourceKind === 'match'
        ? [
          rule({ id: 61, sourcePlacement: 1, targetKind: 'phase_group', targetId: 40, targetSlot: 1 }),
          rule({ id: 62, sourcePlacement: 2, targetKind: 'phase_group', targetId: 40, targetSlot: 2 }),
        ]
        : []),
    );
    poolsAre(pool(40));

    await manager.advanceFromMatch(MatchAggregate.of(source));

    const loadsOfTargetPool = phaseGroupStore.load.mock.calls.filter(([id]) => id === 40);
    expect(loadsOfTargetPool).toHaveLength(1);
    expect(savedPool(40).entrants.map((each) => each.entrant.id)).toEqual([winner.id, runnerUp.id]);
    expect(publisher.emitPhaseGroupUpdate).toHaveBeenCalledTimes(1);
  });

  it('leaves a target match alone when the entrant to remove is not in it', async () => {
    const winner = entrant(1, 101);
    const source = completedMatch(10, [winner], [{ playerId: 101, points: 1 }]);
    advancementRuleService.findBySource.mockImplementation((sourceKind: string) =>
      Promise.resolve(sourceKind === 'match' ? [rule({ targetKind: 'match', targetId: 20 })] : []),
    );
    matchStore.load.mockResolvedValue(MatchAggregate.of({ id: 20, entrants: [], phaseGroup: { id: 31 } } as Match));

    await manager.revertFromMatch(MatchAggregate.of(source));

    expect(matchStore.save).not.toHaveBeenCalled();
  });
});
