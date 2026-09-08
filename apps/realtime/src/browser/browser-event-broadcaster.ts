import type { RealtimeMessage } from '../realtime-message';

export const BROWSER_EVENT_BROADCASTER = Symbol('BROWSER_EVENT_BROADCASTER');

export interface BrowserEventBroadcaster {
  broadcast(tournamentId: number, message: RealtimeMessage): void;
}
