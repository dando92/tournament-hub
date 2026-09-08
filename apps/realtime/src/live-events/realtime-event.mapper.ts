import type { SequencedLiveEventEnvelope } from '@tournament-hub/live-messaging';
import type { RealtimeMessage } from '../realtime-message';

export function mapRealtimeEvent(source: SequencedLiveEventEnvelope & { sequence: number }): RealtimeMessage {
  if (source.type === 'ui.match-changed') {
    return message('MatchUpdate', source.payload, source.sequence);
  }
  if (source.type === 'ui.warning') {
    return message('UiWarning', { tournamentId: source.tournamentId, ...(source.payload as object) }, source.sequence);
  }
  if (source.type === 'tournament.snapshot-changed') {
    return message('TournamentUpdate', { tournamentId: source.tournamentId }, source.sequence);
  }

  const eventName = uiEventName(source.type);
  if (eventName) {
    return message(eventName, source.payload, source.sequence);
  }

  return { event: 'RealtimeSequence', data: { tournamentId: source.tournamentId }, sequence: source.sequence };
}

function message(event: string, data: unknown, sequence: number): RealtimeMessage {
  return { event, data, sequence };
}

function uiEventName(type: string): string | undefined {
  const names: Record<string, string> = {
    'ui.tournament-changed': 'TournamentUpdate',
    'ui.songs-changed': 'SongsUpdate',
    'ui.division-changed': 'DivisionUpdate',
    'ui.phase-changed': 'PhaseUpdate',
    'ui.phase-group-changed': 'PhaseGroupUpdate',
    'ui.schedule-changed': 'ScheduleUpdate',
  };

  return names[type];
}
