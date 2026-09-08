import { useState } from "react";
import { useMatch } from "react-router-dom";
import { usePermissions } from "@/features/auth/model/PermissionContext";
import {
  ParticipantsManageModal,
  TournamentPageContextValue,
} from "@/features/tournament/model/TournamentPageContext";
import { useTournamentPage } from "@/features/tournament/model/useTournamentPage";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";

export function useTournamentPageContainer(tournamentId: number) {
  const divisionMatch = useMatch("/tournament/:tournamentId/division/:divisionId/*");
  const { canEditTournament } = usePermissions();
  const canControl = canEditTournament(tournamentId);
  const state = useTournamentPage({ tournamentId, canControl });
  const tree = useTournamentTree();
  const [participantsManageModal, setParticipantsManageModal] = useState<ParticipantsManageModal>("none");

  const parsedDivisionId = divisionMatch?.params.divisionId ? Number(divisionMatch.params.divisionId) : undefined;
  const currentDivisionId = parsedDivisionId && Number.isFinite(parsedDivisionId) ? parsedDivisionId : undefined;

  const context: TournamentPageContextValue = {
    tournamentId,
    tournamentName: state.tournamentName,
    currentDivisionId,
    hasStartggApiKey: state.hasStartggApiKey,
    tournamentStatus: state.tournamentStatus,
    divisions: tree.divisions,
    controls: canControl && state.tournamentStatus === "open",
    setTournamentName: state.setTournamentName,
    setHasStartggApiKey: state.setHasStartggApiKey,
    setTournamentStatus: state.setTournamentStatus,
    refreshDivisions: tree.refreshTree,
    openCreateDivision: () => tree.openDialog({ kind: "createDivision" }),
    participantsManageModal,
    setParticipantsManageModal,
  };

  return { context, state };
}
