import type { SequencedLiveEventEnvelope } from '@tournament-hub/live-messaging';
import { mapRealtimeEvent } from '../live-events/realtime-event.mapper';
import type { RealtimeMessage, RealtimeSnapshot } from '../realtime-message';

export class TournamentRealtimeState {
  private readonly snapshots = new Map<string, RealtimeMessage>();
  private lastSequence = 0;

  constructor(readonly tournamentId: number) {}

  apply(event: SequencedLiveEventEnvelope): RealtimeMessage {
    if (event.tournamentId !== this.tournamentId) {
      throw new Error(`Cannot apply tournament ${event.tournamentId} event to tournament ${this.tournamentId} state`);
    }

    const sequence = event.sequence ?? this.lastSequence + 1;
    this.lastSequence = sequence;
    const message = mapRealtimeEvent({ ...event, sequence });
    this.cache(message);

    return message;
  }

  snapshot(): RealtimeSnapshot {
    return { sequence: this.lastSequence, messages: [...this.snapshots.values()] };
  }

  private cache(message: RealtimeMessage): void {
    if (message.event === 'RealtimeSequence') return;
    this.snapshots.set(messageIdentity(message), message);
  }
}

function messageIdentity(message: RealtimeMessage): string {
  const data = message.data as { matchId?: number } | undefined;

  return data?.matchId ? `${message.event}:match:${data.matchId}` : message.event;
}
