import { phaseGroupLabel } from "@/features/division/model/phaseGroupLabel";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";
import type { PathLevel, PathValue } from "@/shared/components/ui/cascadingPath";


export type MatchPath = {
  divisionId: number | null;
  phaseId: number | null;
  phaseGroupId: number | null;
};

export type CompleteMatchPath = {
  divisionId: number;
  phaseId: number;
  phaseGroupId: number;
};

export function isCompleteMatchPath(path: MatchPath): path is CompleteMatchPath {
  return path.divisionId !== null && path.phaseId !== null && path.phaseGroupId !== null;
}

export function matchPathLevels(divisions: TournamentDivisionOption[]): PathLevel<number>[] {
  const phasesOf = (divisionId: number | null) =>
    divisions.find((division) => division.id === divisionId)?.phases ?? [];

  return [
    {
      key: "division",
      label: "Division",
      getOptions: () => divisions.map((division) => ({ value: division.id, label: division.name })),
    },
    {
      key: "phase",
      label: "Phase",
      getOptions: ([divisionId]) =>
        phasesOf(divisionId).map((phase) => ({ value: phase.id, label: phase.name })),
    },
    {
      key: "phaseGroup",
      label: "Pool",
      implicitWhenSingle: true,
      getOptions: ([divisionId, phaseId]) =>
        (phasesOf(divisionId).find((phase) => phase.id === phaseId)?.phaseGroups ?? []).map((pool) => ({
          value: pool.id,
          label: phaseGroupLabel(pool),
        })),
    },
  ];
}


export function matchPathValue(path: MatchPath): PathValue<number> {
  return [path.divisionId, path.phaseId, path.phaseGroupId];
}

export function matchPathFromValue(value: PathValue<number>): MatchPath {
  const [divisionId = null, phaseId = null, phaseGroupId = null] = value;
  return { divisionId, phaseId, phaseGroupId };
}
