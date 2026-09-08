import { ReactNode, useEffect, useRef } from "react";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { SequencedRealtimeMessage, useRealtimeSocket } from "@/shared/realtime/useRealtimeSocket";
import { TournamentSocketMessage, staleAfterUpdate } from "@/features/tournament/model/staleAfterUpdate";

const UI_UPDATE_INVALIDATION_DEBOUNCE_MS = 150;

export function TournamentUpdatesProvider({
  tournamentId,
  canEdit,
  children,
}: {
  tournamentId: number;
  canEdit: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const pendingKeys = useRef<Map<string, QueryKey>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markStale(keys: QueryKey[]) {
    keys.forEach((key) => pendingKeys.current.set(JSON.stringify(key), key));
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flushInvalidations, UI_UPDATE_INVALIDATION_DEBOUNCE_MS);
  }

  function flushInvalidations() {
    const keys = [...pendingKeys.current.values()];
    pendingKeys.current = new Map();
    debounceTimer.current = null;

    keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true }));
  }

  useRealtimeSocket("/uiupdatehub", tournamentId, (message: SequencedRealtimeMessage, replayed: boolean) => {
    const msg = message as TournamentSocketMessage & SequencedRealtimeMessage;

    if (replayed) return;

    if (!msg?.data || msg.data.tournamentId !== tournamentId) return;

    if (msg.event === "UiWarning") {
      if (canEdit) toast.warn(msg.data.message);

      return;
    }

    markStale(staleAfterUpdate(msg));
  }, async () => {
    await queryClient.invalidateQueries();
  });

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return <>{children}</>;
}
