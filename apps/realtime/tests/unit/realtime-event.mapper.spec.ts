import type { SequencedLiveEventEnvelope } from '@tournament-hub/live-messaging';
import { mapRealtimeEvent } from '@realtime/live-events/realtime-event.mapper';

describe('mapRealtimeEvent', () => {
  const update: SequencedLiveEventEnvelope & { sequence: number } = {
    type: 'ui.match-changed',
    tournamentId: 7,
    sequence: 12,
    payload: { tournamentId: 7, divisionId: 3, phaseId: 4, phaseGroupId: 5, matchId: 6 },
  };

  it('maps prepared UI events and preserves their scoped sequence', () => {
    expect(mapRealtimeEvent(update)).toEqual({ event: 'MatchUpdate', data: update.payload, sequence: 12 });
  });

  it('maps song catalogue invalidations to their browser event', () => {
    const songsUpdate: SequencedLiveEventEnvelope & { sequence: number } = {
      type: 'ui.songs-changed',
      tournamentId: 7,
      sequence: 13,
      payload: { tournamentId: 7 },
    };

    expect(mapRealtimeEvent(songsUpdate)).toEqual({ event: 'SongsUpdate', data: songsUpdate.payload, sequence: 13 });
  });

  it('advances the sequence without leaking data for an event no browser reads', () => {
    const unknown: SequencedLiveEventEnvelope & { sequence: number } = {
      type: 'something.else',
      tournamentId: 7,
      sequence: 14,
      payload: { secret: true },
    };

    expect(mapRealtimeEvent(unknown)).toEqual({ event: 'RealtimeSequence', data: { tournamentId: 7 }, sequence: 14 });
  });
});
