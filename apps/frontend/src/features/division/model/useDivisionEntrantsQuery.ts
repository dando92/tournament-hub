import { useQuery } from "@tanstack/react-query";
import { listDivisionEntrants } from "@/features/division/api/division.api";
import { divisionKeys } from "@/features/division/api/division.keys";

export function useDivisionEntrantsQuery(divisionId: number) {
  return useQuery({
    queryKey: divisionKeys.entrants(divisionId),
    queryFn: () => listDivisionEntrants(divisionId),
  });
}
