import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Division } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";
import { getDivisionSummary } from "@/features/division/api/division.api";
import { divisionKeys } from "@/features/division/api/division.keys";
import { useDivisionEntrantsQuery } from "@/features/division/model/useDivisionEntrantsQuery";

type UseDivisionPageResult = {
  division: Division | null;
  entrants: Entrant[];
};

export function useDivisionPage(_tournamentId: number, divisionId: number): UseDivisionPageResult {
  const summaryKey = useMemo(() => divisionKeys.summary(divisionId), [divisionId]);
  const query = useQuery({
    queryKey: summaryKey,
    queryFn: () => getDivisionSummary(divisionId),
  });
  const entrants = useDivisionEntrantsQuery(divisionId);

  return {
    division: query.data ?? null,
    entrants: entrants.data ?? [],
  };
}
