import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issueControlRoomKey, revokeControlRoomKey } from "@/features/tournament/api/tournament.api";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";
import { usePageNotices } from "@/shared/context/PageNoticeContext";

export function useControlRoomKey(tournamentId: number) {
  const queryClient = useQueryClient();
  const { report, dismiss } = usePageNotices();
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const issueMutation = useMutation({ mutationFn: () => issueControlRoomKey(tournamentId) });
  const revokeMutation = useMutation({ mutationFn: () => revokeControlRoomKey(tournamentId) });

  function refreshConfiguration() {
    return queryClient.invalidateQueries({ queryKey: tournamentKeys.configuration(tournamentId) });
  }

  async function issue(replacing: boolean) {
    if (replacing && !window.confirm("Generate a new key? The one this venue is using stops working immediately.")) {
      return;
    }
    try {
      setIssuedKey(await issueMutation.mutateAsync());
      setCopied(false);
      await refreshConfiguration();
      dismiss("Failed to generate the control-room key.");
    } catch {
      report("Failed to generate the control-room key.");
    }
  }

  async function revoke() {
    if (!window.confirm("Revoke this key? The control room using it stops being able to read the plan or report runs.")) {
      return;
    }
    try {
      await revokeMutation.mutateAsync();
      setIssuedKey(null);
      await refreshConfiguration();
      dismiss("Failed to revoke the control-room key.");
    } catch {
      report("Failed to revoke the control-room key.");
    }
  }

  async function copy() {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      setCopied(true);
    } catch {
      report("Could not copy the key. Select it and copy it by hand.");
    }
  }

  return {
    issuedKey,
    copied,
    issuing: issueMutation.isPending,
    revoking: revokeMutation.isPending,
    issue,
    revoke,
    copy,
    forget: () => setIssuedKey(null),
  };
}
