import { Division, Entrant, Participant, Phase } from '@tournament-hub/persistence';
import { DivisionAggregate } from '@tournament/structure/division/division.aggregate';

describe('DivisionAggregate', () => {
  function participant(id: number, playerName: string): Participant {
    return { id, player: { id: id * 10, playerName } } as Participant;
  }

  function entrant(id: number, name: string, seedNum: number | null = null, participants: Participant[] = []): Entrant {
    return { id, name, seedNum, status: 'active', participants } as Entrant;
  }

  function division(entrants: Entrant[]): DivisionAggregate {
    return DivisionAggregate.of({ id: 4, name: 'Open', tournament: { id: 7 }, entrants, phases: [] } as Division);
  }

  describe('seeding', () => {
    it('numbers the entrants in the order they are given', () => {
      const entrants = [entrant(1, 'Ann'), entrant(2, 'Bob'), entrant(3, 'Cal')];

      division(entrants).seed([3, 1, 2]);

      expect(entrants.map((value) => value.seedNum)).toEqual([2, 3, 1]);
    });

    it('leaves an entrant the list does not name where it was', () => {
      const entrants = [entrant(1, 'Ann', 5), entrant(2, 'Bob')];

      division(entrants).seed([2]);

      expect(entrants.map((value) => value.seedNum)).toEqual([5, 1]);
    });

    it('refuses an entrant that belongs to another division', () => {
      expect(() => division([entrant(1, 'Ann')]).seed([99])).toThrow('Entrant 99 does not belong to division 4');
    });
  });

  describe('the roster', () => {
    it('admits somebody who does not compete yet', () => {
      const roster = division([]);

      const admitted = roster.admit(participant(3, 'Cal'));

      expect(admitted.name).toBe('Cal');
      expect(admitted.status).toBe('active');
      expect(roster.activeEntrants).toEqual([admitted]);
    });

    it('reactivates the entrant a withdrawn participant already had', () => {
      const existing = entrant(1, 'Ann', 2, [participant(3, 'Cal')]);
      existing.status = 'withdrawn';
      const roster = division([existing]);

      const admitted = roster.admit(participant(3, 'Cal'));

      expect(admitted).toBe(existing);
      expect(existing.status).toBe('active');
      expect(existing.seedNum).toBe(2);
    });

    it('withdraws by participant and by player, and keeps the entrant', () => {
      const byParticipant = entrant(1, 'Ann', 1, [participant(3, 'Ann')]);
      const byPlayer = entrant(2, 'Bob', 2, [participant(4, 'Bob')]);
      const roster = division([byParticipant, byPlayer]);

      roster.withdrawParticipant(3);
      roster.withdrawPlayer(40);

      expect([byParticipant.status, byPlayer.status]).toEqual(['withdrawn', 'withdrawn']);
      expect(roster.activeEntrants).toEqual([]);
    });

    it('ignores a withdrawal of somebody who does not compete here', () => {
      const only = entrant(1, 'Ann', 1, [participant(3, 'Ann')]);
      const roster = division([only]);

      roster.withdrawParticipant(99);
      roster.withdrawPlayer(99);

      expect(only.status).toBe('active');
    });
  });

  describe('the entrants a bracket is built from', () => {
    it('sorts the seeded first, then by name', () => {
      const roster = division([entrant(1, 'Cal'), entrant(2, 'Ann', 2), entrant(3, 'Bob', 1)]);

      expect(roster.activeEntrants.map((value) => value.name)).toEqual(['Bob', 'Ann', 'Cal']);
    });

    it('leaves out everybody who is not active', () => {
      const withdrawn = entrant(2, 'Bob', 2);
      withdrawn.status = 'withdrawn';
      const roster = division([entrant(1, 'Ann', 1), withdrawn]);

      expect(roster.activeEntrants.map((value) => value.name)).toEqual(['Ann']);
    });

    it('refuses to generate a bracket for a division nobody competes in', () => {
      expect(() => division([]).assertCanGenerateBracket()).toThrow('Cannot generate a bracket without active entrants.');
    });
  });

  it('numbers a generated phase after the ones already there', () => {
    const roster = DivisionAggregate.of({ id: 4, phases: [{ id: 1 }, { id: 2 }], entrants: [] } as Division);

    expect(roster.nextPhaseNumber).toBe(3);
  });

  it('carries the address its events are routed by', () => {
    expect(division([]).address).toEqual({ tournamentId: 7, divisionId: 4 });
  });

  describe('its phases', () => {
    function withPhases(...phases: Array<Partial<Phase>>): DivisionAggregate {
      return DivisionAggregate.of({ id: 4, phases, entrants: [] } as Division);
    }

    it('adds a phase to the division that holds it', () => {
      const roster = withPhases();

      const phase = roster.addPhase('Qualifiers');

      expect(phase.name).toBe('Qualifiers');
      expect(roster.entity.phases).toEqual([phase]);
      expect(phase.division).toBe(roster.entity);
    });

    it('renames a phase and trims what it was given', () => {
      const roster = withPhases({ id: 9, name: 'Qualifiers' });

      roster.renamePhase(9, '  Finals  ');

      expect(roster.entity.phases[0].name).toBe('Finals');
    });

    it('keeps the current name when the new one is blank', () => {
      const roster = withPhases({ id: 9, name: 'Qualifiers' });

      roster.renamePhase(9, '   ');

      expect(roster.entity.phases[0].name).toBe('Qualifiers');
    });

    it('removes a phase and tells the store to delete its row', () => {
      const roster = withPhases({ id: 9 }, { id: 10 });

      roster.removePhase(9);

      expect(roster.entity.phases.map((phase) => phase.id)).toEqual([10]);
      expect(roster.removals).toEqual([9]);
    });

    it('refuses a phase of another division', () => {
      expect(() => withPhases({ id: 9 }).removePhase(404)).toThrow('Phase with ID 404 not found');
    });
  });
});
