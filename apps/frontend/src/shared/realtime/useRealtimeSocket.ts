import { useEffect, useRef } from "react";
import { realtimeUrl } from "../runtime-config";

export type SequencedRealtimeMessage = {
  event: string;
  data: unknown;
  sequence: number;
};

type RealtimeReadyData = {
  tournamentId: number;
  messages: SequencedRealtimeMessage[];
};

type RealtimePath = "/uiupdatehub";

export function realtimeWebSocketUrl(path: RealtimePath, tournamentId: number): string {
  const resolved = new URL(path.slice(1), realtimeUrl());
  resolved.searchParams.set("tournamentId", String(tournamentId));
  return resolved.href.replace(/^http/, "ws");
}

export function useRealtimeSocket(
  path: RealtimePath,
  tournamentId: number,
  onMessage: (message: SequencedRealtimeMessage, replayed: boolean) => void,
  onAuthoritativeRecovery?: () => void | Promise<void>,
) {
  const messageHandler = useRef(onMessage);
  const recoveryHandler = useRef(onAuthoritativeRecovery);

  useEffect(() => { messageHandler.current = onMessage; }, [onMessage]);
  useEffect(() => { recoveryHandler.current = onAuthoritativeRecovery; }, [onAuthoritativeRecovery]);

  useEffect(() => {
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) return;
    let socket: WebSocket | undefined;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectAttempt = 0;
    let lastSequence: number | undefined;
    let resumed = false;

    function connect() {
      if (stopped) return;
      socket = new WebSocket(realtimeWebSocketUrl(path, tournamentId));
      socket.onopen = () => {
        reconnectAttempt = 0;
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SequencedRealtimeMessage;
          if (!Number.isSafeInteger(message.sequence)) return;
          if (message.event === "RealtimeReady") {
            if (resumed && (lastSequence === undefined || message.sequence > lastSequence)) {
              void recoveryHandler.current?.();
            }
            resumed = false;
            const ready = message.data as RealtimeReadyData | undefined;
            for (const cached of ready?.messages ?? []) messageHandler.current(cached, true);
            lastSequence = message.sequence;
            return;
          }
          if (lastSequence !== undefined && message.sequence > lastSequence + 1) {
            void recoveryHandler.current?.();
          }
          if (lastSequence !== undefined && message.sequence <= lastSequence) return;
          lastSequence = message.sequence;
          if (message.event !== "RealtimeSequence") messageHandler.current(message, false);
        } catch {
            // A frame that does not parse, or a handler that throws, must not take the socket down.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        resumed = true;
        const delay = Math.min(5000, 250 * 2 ** reconnectAttempt++);
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [path, tournamentId]);
}
