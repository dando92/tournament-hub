import type { Status } from "@/shared/components/ui/status";
import type { PhaseGroup } from "@/features/division/model/types";
import type { TournamentDivisionOption, TournamentDivisionOptionPhase } from "@/features/tournament/model/types";

export function rollUpStatus(children: Status[]): Status {
  if (children.length === 0) return "idle";
  if (children.every((status) => status === "done")) return "done";
  if (children.some((status) => status === "failed")) return "failed";
  if (children.some((status) => status === "pending")) return "pending";
  if (children.some((status) => status === "running" || status === "done")) return "running";
  return "idle";
}

export function poolStatus(phaseGroup: PhaseGroup): Status {
  if ((phaseGroup.pendingMatchCount ?? 0) > 0) return "pending";
  if (phaseGroup.state === "completed" && phaseGroup.matchCount > 0) return "done";
  if ((phaseGroup.progressedMatchCount ?? 0) > 0) return "running";
  if (phaseGroup.matchCount === 0) return "idle";
  return "idle";
}

export function phaseStatus(phase: TournamentDivisionOptionPhase): Status {
  return rollUpStatus((phase.phaseGroups ?? []).map(poolStatus));
}

export function divisionStatus(division: TournamentDivisionOption): Status {
  return rollUpStatus(division.phases.map(phaseStatus));
}

export function tournamentStatus(divisions: TournamentDivisionOption[]): Status | undefined {
  if (divisions.length === 0) return undefined;
  return rollUpStatus(divisions.map(divisionStatus));
}
