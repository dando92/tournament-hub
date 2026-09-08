import { useQuery } from "@tanstack/react-query";
import { getTournamentOverview } from "@/features/tournament/api/tournament.api";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";
import { TournamentOverview } from "@/features/tournament/model/types";
import { TournamentDivisionOption } from "@/features/tournament/model/types";


export function toDivisionOptions(overview: TournamentOverview): TournamentDivisionOption[] {
  return overview.divisions.map((division) => ({
    id: division.id,
    name: division.name,
    structureVersion: division.structureVersion,
    entrantCount: division.entrantCount,
    phases: division.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      matchCount: phase.matchCount,
      phaseGroups: phase.phaseGroups ?? [],
    })),
  }));
}

export function useTournamentOverviewQuery(tournamentId: number | null) {
  return useQuery({
    queryKey: tournamentKeys.overview(tournamentId ?? 0),
    enabled: tournamentId !== null,
    queryFn: async () => toDivisionOptions(await getTournamentOverview(tournamentId ?? 0)),
  });
}
