export const REALTIME_PATH = '/uiupdatehub';

export type RealtimeMessage = {
  event: string;
  data: unknown;
  sequence: number;
};

export type RealtimeSnapshot = {
  sequence: number;
  messages: RealtimeMessage[];
};

export type RealtimeReadyMessage = {
  event: 'RealtimeReady';
  data: { tournamentId: number; messages: RealtimeMessage[] };
  sequence: number;
};

export function isRealtimePath(path: string): boolean {
  return path === REALTIME_PATH;
}
