import type { PhaseGroup } from "@/features/division/model/types";

export function phaseGroupLabel(phaseGroup: PhaseGroup): string {
  return phaseGroup.displayIdentifier?.trim() || phaseGroup.name;
}
