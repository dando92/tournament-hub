import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listByDivision } from "@/features/match/api/match.api";
import { matchKeys } from "@/features/match/api/match.keys";
import { Match } from "@/features/match/model/types";

export function useAdvancementTargets(divisionId: number): () => Promise<Match[]> {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: matchKeys.byDivision(divisionId),
        queryFn: () => listByDivision(divisionId),
      }),
    [queryClient, divisionId],
  );
}
