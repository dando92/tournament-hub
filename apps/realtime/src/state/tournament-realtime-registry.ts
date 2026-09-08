import { Injectable } from '@nestjs/common';
import type { RealtimeSnapshot } from '../realtime-message';
import type { RealtimeSnapshotReader } from '../snapshots/realtime-snapshot-reader';
import { TournamentRealtimeState } from './tournament-realtime-state';

@Injectable()
export class TournamentRealtimeRegistry implements RealtimeSnapshotReader {
  private readonly states = new Map<number, TournamentRealtimeState>();

  getOrCreate(tournamentId: number): TournamentRealtimeState {
    const existing = this.states.get(tournamentId);
    if (existing) return existing;

    const state = new TournamentRealtimeState(tournamentId);
    this.states.set(tournamentId, state);
    return state;
  }

  snapshot(tournamentId: number): RealtimeSnapshot {
    return this.states.get(tournamentId)?.snapshot() ?? { sequence: 0, messages: [] };
  }
}
