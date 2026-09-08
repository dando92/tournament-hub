import type { Dispatch, SetStateAction } from "react";
import { useOutletContext } from "react-router-dom";
import { TournamentDivisionOption } from "@/features/tournament/model/types";

export type ParticipantsManageModal =
  "none" | "register" | "database" | "import" | "startgg";

export type TournamentPageContextValue = {
  tournamentId: number;
  tournamentName: string;
  currentDivisionId?: number;
  hasStartggApiKey: boolean;
  tournamentStatus: "open" | "closed";
  divisions: TournamentDivisionOption[];
  controls: boolean;
  setTournamentName: Dispatch<SetStateAction<string>>;
  setHasStartggApiKey: Dispatch<SetStateAction<boolean>>;
  setTournamentStatus: Dispatch<SetStateAction<"open" | "closed">>;
  refreshDivisions: () => Promise<void>;
  openCreateDivision: () => void;
  participantsManageModal: ParticipantsManageModal;
  setParticipantsManageModal: Dispatch<SetStateAction<ParticipantsManageModal>>;
};

export function useTournamentPageContext() {
  return useOutletContext<TournamentPageContextValue>();
}
