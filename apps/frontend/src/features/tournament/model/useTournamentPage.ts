import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { getTournament, hasStartggApiKey as loadHasStartggApiKey } from "@/features/tournament/api/tournament.api";
import { rememberTournament } from "@/shared/lib/recentTournaments";

type UseTournamentPageOptions = {
  tournamentId: number;
  canControl: boolean;
};

export type TournamentPageState = {
  tournamentName: string;
  hasStartggApiKey: boolean;
  tournamentStatus: "open" | "closed";
  setTournamentName: Dispatch<SetStateAction<string>>;
  setHasStartggApiKey: Dispatch<SetStateAction<boolean>>;
  setTournamentStatus: Dispatch<SetStateAction<"open" | "closed">>;
};

export function useTournamentPage({ tournamentId, canControl }: UseTournamentPageOptions): TournamentPageState {
  const [tournamentName, setTournamentName] = useState("");
  const [hasStartggApiKey, setHasStartggApiKey] = useState(false);
  const [tournamentStatus, setTournamentStatus] = useState<"open" | "closed">("open");

  useEffect(() => {
    getTournament(tournamentId)
      .then((tournament) => {
        rememberTournament({ id: tournament.id, name: tournament.name });
        setTournamentName(tournament.name);
        setTournamentStatus(tournament.status);
        document.title = `${tournament.name} - Tournament Hub`;
      })
      .catch(() => {});

    return () => {
      document.title = "Tournament Hub";
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!canControl) return;
    loadHasStartggApiKey(tournamentId)
      .then(setHasStartggApiKey)
      .catch(() => setHasStartggApiKey(false));
  }, [canControl, tournamentId]);

  return {
    tournamentName,
    hasStartggApiKey,
    tournamentStatus,
    setTournamentName,
    setHasStartggApiKey,
    setTournamentStatus,
  };
}
