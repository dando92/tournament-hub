import { isEliminationBracket, isRoundRobinBracket } from "@/features/division/model/bracketType";

export type PoolViewMode = "raw" | "roundRobin" | "bracket";

const STORAGE_KEY = "pool_view_modes";

export function availablePoolViewModes(bracketType: string | null | undefined): PoolViewMode[] {
  if (isRoundRobinBracket(bracketType)) return ["raw", "roundRobin"];
  if (isEliminationBracket(bracketType)) return ["raw", "bracket"];
  return ["raw"];
}

export function defaultPoolViewMode(bracketType: string | null | undefined): PoolViewMode {
  if (isRoundRobinBracket(bracketType)) return "roundRobin";
  if (isEliminationBracket(bracketType)) return "bracket";
  return "raw";
}

export function readPoolViewMode(phaseGroupId: number, bracketType: string | null | undefined): PoolViewMode {
  const stored = readStoredModes()[String(phaseGroupId)];
  const available = availablePoolViewModes(bracketType);
  return available.includes(stored as PoolViewMode) ? (stored as PoolViewMode) : defaultPoolViewMode(bracketType);
}

export function writePoolViewMode(
  phaseGroupId: number,
  bracketType: string | null | undefined,
  mode: PoolViewMode,
): void {
  const modes = readStoredModes();
  if (mode === defaultPoolViewMode(bracketType)) {
    delete modes[String(phaseGroupId)];
  } else {
    modes[String(phaseGroupId)] = mode;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
  } catch {
      // Storage can be unavailable or full; a stored preference is not worth failing a render over.
  }
}

function readStoredModes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
