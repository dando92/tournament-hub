import type { SequencedLiveEventEnvelope } from '@tournament-hub/live-messaging';
import { TournamentRealtimeRegistry } from '@realtime/state/tournament-realtime-registry';
import { TournamentRealtimeState } from '@realtime/state/tournament-realtime-state';

describe('TournamentRealtimeState', () => {
  it('owns local sequencing without mutating the subscribed envelope', () => {
    const state = new TournamentRealtimeState(7);
    const event: SequencedLiveEventEnvelope = {
      type: 'ui.tournament-changed',
      tournamentId: 7,
      payload: { tournamentId: 7 },
    };

    const first = state.apply(event);
    const second = state.apply({ ...event, type: 'ui.division-changed' });

    expect(event.sequence).toBeUndefined();
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(state.snapshot().sequence).toBe(2);
  });

  it('uses the latest prepared message for the same snapshot identity', () => {
    const state = new TournamentRealtimeState(7);
    state.apply(matchChanged(3, 10));
    state.apply(matchChanged(3, 11));

    expect(state.snapshot()).toEqual({
      sequence: 11,
      messages: [{
        event: 'MatchUpdate',
        data: expect.objectContaining({ matchId: 3, version: 11 }),
        sequence: 11,
      }],
    });
  });

  it('rejects events belonging to another tournament', () => {
    const state = new TournamentRealtimeState(7);
    expect(() => state.apply({ type: 'ui.warning', tournamentId: 8, payload: {} }))
      .toThrow('Cannot apply tournament 8 event to tournament 7 state');
  });
});

describe('TournamentRealtimeRegistry', () => {
  it('keeps tournament projections independent and returns an empty snapshot before intake', () => {
    const registry = new TournamentRealtimeRegistry();
    expect(registry.snapshot(7)).toEqual({ sequence: 0, messages: [] });

    registry.getOrCreate(7).apply(matchChanged(3, 1));

    expect(registry.getOrCreate(7)).toBe(registry.getOrCreate(7));
    expect(registry.snapshot(7).messages).toHaveLength(1);
    expect(registry.snapshot(8)).toEqual({ sequence: 0, messages: [] });
  });

  it('produces convergent projections on independent replicas', () => {
    const firstReplica = new TournamentRealtimeRegistry();
    const secondReplica = new TournamentRealtimeRegistry();
    const events = [tournamentChanged(), matchChanged(3, undefined)];

    for (const event of events) {
      firstReplica.getOrCreate(7).apply(event);
      secondReplica.getOrCreate(7).apply(event);
    }

    expect(firstReplica.snapshot(7)).toEqual(secondReplica.snapshot(7));
  });
});

function matchChanged(matchId: number, sequence?: number): SequencedLiveEventEnvelope {
  return {
    type: 'ui.match-changed',
    tournamentId: 7,
    sequence,
    payload: { tournamentId: 7, matchId, version: sequence },
  };
}

function tournamentChanged(): SequencedLiveEventEnvelope {
  return { type: 'ui.tournament-changed', tournamentId: 7, payload: { tournamentId: 7 } };
}
