const STORAGE_KEY = "tree_expanded";
const COLLAPSED_TOURNAMENT_SECTIONS_KEY = "tree_collapsed_tournament_sections";

export type TournamentSectionKey = "pinned" | "recent";

export type TreeNodeKind = "tournament" | "division" | "phase";

export function treeNodeKey(kind: TreeNodeKind, id: number): string {
  return `${kind}:${id}`;
}

export function getExpandedNodes(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((key): key is string => typeof key === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function setExpandedNodes(keys: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
      // Storage can be unavailable or full; a stored preference is not worth failing a render over.
  }
}

export function getCollapsedTournamentSections(): Set<TournamentSectionKey> {
  try {
    const raw = localStorage.getItem(COLLAPSED_TOURNAMENT_SECTIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? new Set(parsed.filter((key): key is TournamentSectionKey => key === "pinned" || key === "recent"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function setCollapsedTournamentSections(keys: ReadonlySet<TournamentSectionKey>): void {
  try {
    localStorage.setItem(COLLAPSED_TOURNAMENT_SECTIONS_KEY, JSON.stringify([...keys]));
  } catch {
      // Storage can be unavailable or full; a stored preference is not worth failing a render over.
  }
}
