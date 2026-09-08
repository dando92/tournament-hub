import { useQuery } from "@tanstack/react-query";
import { listPublicTournaments } from "@/features/tournament/api/tournament.api";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";

export function usePublicTournamentsQuery(enabled = true) {
  return useQuery({
    queryKey: tournamentKeys.publicList(),
    enabled,
    queryFn: listPublicTournaments,
  });
}
