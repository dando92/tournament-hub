import { useOutletContext } from "react-router-dom";
import { Division } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";

export type DivisionPageContextValue = {
  division: Division;
  entrants: Entrant[];
  tournamentId: number;
  divisionId: number;
  controls: boolean;
};

export function useDivisionPageContext() {
  return useOutletContext<DivisionPageContextValue>();
}
