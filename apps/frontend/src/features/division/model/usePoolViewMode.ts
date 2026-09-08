import { useState } from "react";
import { PoolViewMode, readPoolViewMode, writePoolViewMode } from "@/shared/lib/poolViewMode";
import { PhaseGroup } from "@/features/division/model/types";

export function usePoolViewMode(phaseGroup: PhaseGroup): [PoolViewMode, (mode: PoolViewMode) => void] {
  const [mode, setMode] = useState<PoolViewMode>(() => readPoolViewMode(phaseGroup.id, phaseGroup.bracketType));

  const changeMode = (next: PoolViewMode) => {
    setMode(next);
    writePoolViewMode(phaseGroup.id, phaseGroup.bracketType, next);
  };

  return [mode, changeMode];
}
