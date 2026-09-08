import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Participant, Player } from "@/features/participant/model/types";
import { getAllPlayers } from "@/features/participant/api/player.api";
import { useItgmaniaProfileExport } from "@/features/participant/model/useItgmaniaProfileExport";
import { useTournamentPageContext } from "@/features/tournament/model/TournamentPageContext";
import {
  createParticipant,
  importParticipants,
  listParticipants,
  makeParticipantStaff,
  previewParticipantImport,
  removeParticipant,
  removeParticipantStaff,
  type ParticipantImportPreviewEntry,
} from "@/features/participant/api/participant.api";
import { participantKeys } from "@/features/participant/api/participant.keys";

const noParticipants: Participant[] = [];
const noPlayers: Player[] = [];

export function useTournamentParticipantsPage() {
  const { tournamentId, tournamentName, controls, participantsManageModal, setParticipantsManageModal } =
    useTournamentPageContext();
  const [name, setName] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [preview, setPreview] = useState<ParticipantImportPreviewEntry[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const participantsQuery = useQuery({
    queryKey: participantKeys.forTournament(tournamentId),
    queryFn: () => listParticipants(tournamentId),
  });
  const playersQuery = useQuery({
    queryKey: participantKeys.players(),
    queryFn: getAllPlayers,
  });
  const registerMutation = useMutation({
    mutationFn: (payload: { playerId?: number; playerName?: string }) => createParticipant(tournamentId, payload),
  });
  const importMutation = useMutation({
    mutationFn: (entries: Array<{ name: string; playerId?: number }>) => importParticipants(tournamentId, entries),
  });
  const removeMutation = useMutation({ mutationFn: (participantId: number) => removeParticipant(tournamentId, participantId) });
  const grantStaffMutation = useMutation({ mutationFn: (participantId: number) => makeParticipantStaff(tournamentId, participantId) });
  const revokeStaffMutation = useMutation({ mutationFn: (participantId: number) => removeParticipantStaff(tournamentId, participantId) });
  const participants = participantsQuery.data ?? noParticipants;
  const allPlayers = playersQuery.data ?? noPlayers;
  const submitting = registerMutation.isPending || importMutation.isPending;
  const profileExport = useItgmaniaProfileExport({ tournamentName, participants });

  const participantPlayerIds = useMemo(
    () => new Set(participants.map((participant) => participant.player.id)),
    [participants],
  );
  const availablePlayers = useMemo(
    () =>
      allPlayers
        .filter((player) => !participantPlayerIds.has(player.id))
        .sort((a, b) => a.playerName.localeCompare(b.playerName)),
    [allPlayers, participantPlayerIds],
  );
  const availablePlayerOptions = useMemo(
    () => availablePlayers.map((player) => ({ value: player.id, label: player.playerName })),
    [availablePlayers],
  );
  const selectedPlayerOptions = useMemo(
    () =>
      selectedPlayerIds
        .map((playerId) => availablePlayerOptions.find((option) => option.value === playerId))
        .filter((option): option is { value: number; label: string } => Boolean(option)),
    [availablePlayerOptions, selectedPlayerIds],
  );
  const filteredParticipants = useMemo(
    () =>
      participants.filter((participant) =>
        participant.player.playerName.toLowerCase().includes(participantSearch.toLowerCase()),
      ),
    [participantSearch, participants],
  );


  async function handleRegister() {
    await registerMutation.mutateAsync({ playerName: name.trim() });
    setName("");
  }

  async function handleAddExistingPlayers() {
    await Promise.all(selectedPlayerIds.map((playerId) => registerMutation.mutateAsync({ playerId })));
    setSelectedPlayerIds([]);
  }

  async function handleRemove(participantId: number) {
    await removeMutation.mutateAsync(participantId);
  }

  async function handleMakeStaff(participantId: number) {
    await grantStaffMutation.mutateAsync(participantId);
  }

  async function handleRemoveStaff(participantId: number) {
    await revokeStaffMutation.mutateAsync(participantId);
  }

  async function handlePreviewImport() {
    const names = bulkText.split("\n").map((entry) => entry.trim()).filter(Boolean);
    if (names.length === 0) return;
    setLoadingPreview(true);
    try {
      setPreview(await previewParticipantImport(tournamentId, names));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirmImport() {
    const entries = preview
      .filter((entry) => !entry.alreadyParticipant)
      .map((entry) => ({
        name: entry.name,
        playerId: entry.matchedPlayer?.id,
      }));
    if (entries.length > 0) {
      await importMutation.mutateAsync(entries);
    }

    setBulkText("");
    setPreview([]);
  }

  return {
    tournamentId,
    controls,
    participants,
    filteredParticipants,
    participantSearch,
    setParticipantSearch,
    name,
    setName,
    availablePlayers,
    availablePlayerOptions,
    selectedPlayerOptions,
    setSelectedPlayerIds,
    selectedPlayerIds,
    bulkText,
    setBulkText,
    preview,
    loadingPreview,
    submitting,
    participantsLoading: participantsQuery.isLoading,
    profileExporting: profileExport.exporting,
    manageModal: participantsManageModal,
    closeManageModal: () => setParticipantsManageModal("none"),
    handleRegister,
    handleAddExistingPlayers,
    handleRemove,
    handleMakeStaff,
    handleRemoveStaff,
    handlePreviewImport,
    handleConfirmImport,
    handleExportItgmaniaProfiles: profileExport.exportProfiles,
  };
}
