import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TournamentConfiguration } from "@/features/tournament/model/types";
import { rememberTournament } from "@/shared/lib/recentTournaments";
import {
  closeTournament,
  getTournamentConfiguration,
  reopenTournament,
  updateTournament,
} from "@/features/tournament/api/tournament.api";
import { listScoringSystems } from "@/features/match/api/match.api";
import { matchKeys } from "@/features/match/api/match.keys";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";
import { useTournamentPageContext } from "@/features/tournament/model/TournamentPageContext";
import { usePageNotices } from "@/shared/context/PageNoticeContext";


export type TournamentConfigurationForm = {
  name: string;
  startggApiKey: string;
  defaultScoringSystem: string;
};

const emptyForm: TournamentConfigurationForm = {
  name: "",
  startggApiKey: "",
  defaultScoringSystem: "",
};
const noScoringSystems: string[] = [];
const noControlRoomKey = { hasKey: false, issuedAt: null, lastUsedAt: null };

function toForm(configuration: TournamentConfiguration): TournamentConfigurationForm {
  return {
    name: configuration.name ?? "",
    startggApiKey: configuration.startggApiKey ?? "",
    defaultScoringSystem: configuration.defaultScoringSystem ?? "",
  };
}

export function useTournamentConfigurationPage() {
  const {
    tournamentId,
    setTournamentName,
    setHasStartggApiKey,
    setTournamentStatus,
  } = useTournamentPageContext();
  const { report, dismiss } = usePageNotices();
  const [initial, setInitial] = useState<TournamentConfigurationForm>(emptyForm);
  const [form, setForm] = useState<TournamentConfigurationForm>(emptyForm);
  const configurationQuery = useQuery({
    queryKey: tournamentKeys.configuration(tournamentId),
    queryFn: () => getTournamentConfiguration(tournamentId),
  });
  const scoringSystemsQuery = useQuery({
    queryKey: matchKeys.scoringSystems(),
    queryFn: listScoringSystems,
  });
  const saveMutation = useMutation({
    mutationFn: (details: TournamentConfigurationForm) => updateTournament(tournamentId, {
      name: details.name.trim(),
      startggApiKey: details.startggApiKey.trim() || null,
      defaultScoringSystem: details.defaultScoringSystem,
    }),
  });
  const closeMutation = useMutation({ mutationFn: () => closeTournament(tournamentId) });
  const reopenMutation = useMutation({ mutationFn: () => reopenTournament(tournamentId) });
  const configuration = configurationQuery.data;
  const scoringSystems = scoringSystemsQuery.data ?? noScoringSystems;
  const loading = configurationQuery.isLoading || scoringSystemsQuery.isLoading;
  const saving = saveMutation.isPending;
  const changingStatus = closeMutation.isPending || reopenMutation.isPending;

  useEffect(() => {
    if (!configuration) return;

    const nextForm = toForm(configuration);
    if (!nextForm.defaultScoringSystem) nextForm.defaultScoringSystem = scoringSystems[0] ?? "";
    setInitial(nextForm);
    setForm(nextForm);
    setTournamentName(nextForm.name);
    setHasStartggApiKey(Boolean(nextForm.startggApiKey));
    setTournamentStatus(configuration.status);
  }, [
    configuration,
    scoringSystems,
    setHasStartggApiKey,
    setTournamentName,
    setTournamentStatus,
  ]);

  const isDirty = useMemo(
    () =>
      form.name !== initial.name ||
      form.startggApiKey !== initial.startggApiKey ||
      form.defaultScoringSystem !== initial.defaultScoringSystem,
    [form, initial],
  );

  const isClosed = configuration?.status === "closed";
  const canSave =
    configuration?.status === "open" && isDirty && !saving && Boolean(form.name.trim()) && Boolean(form.defaultScoringSystem);

  async function handleSave() {
    if (!canSave) return;

    try {
      await saveMutation.mutateAsync(form);
      rememberTournament({ id: tournamentId, name: form.name.trim() });
      dismiss("Failed to save tournament configuration.");
    } catch {
      report("Failed to save tournament configuration.");
    }
  }

  async function handleClose() {
    if (!configuration || changingStatus) return;
    const confirmed = window.confirm(
      `Close this tournament? It will become read-only, its control-room key stops working, and all transport data will be permanently deleted after ${configuration.transportRetentionDays} days.`,
    );
    if (!confirmed) return;
    try {
      await closeMutation.mutateAsync();
    } catch {
      report("Failed to close tournament.");
    }
  }

  async function handleReopen() {
    if (!configuration || changingStatus) return;
    try {
      await reopenMutation.mutateAsync();
    } catch {
      report("Failed to reopen tournament.");
    }
  }

  return {
    tournamentId,
    controlRoomKey: configuration?.controlRoomKey ?? noControlRoomKey,
    form,
    setForm,
    scoringSystems,
    loading,
    saving,
    changingStatus,
    isClosed,
    isDirty,
    canSave,
    resetForm: () => setForm(initial),
    handleSave,
    handleClose,
    handleReopen,
  };
}
