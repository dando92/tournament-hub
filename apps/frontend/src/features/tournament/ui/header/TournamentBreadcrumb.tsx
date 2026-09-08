import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";
import {
  divisionPath,
  parseTreeSelection,
  phasePath,
  tournamentPagePath,
} from "@/features/tournament/model/treeSelection";
import { TOURNAMENT_TREE_PAGES, DIVISION_TREE_PAGES } from "@/features/tournament/ui/tree/treePages";
import { phaseGroupLabel } from "@/features/division/model/phaseGroupLabel";
import { poolsAreVisible } from "@/features/division/model/poolVisibility";

type Crumb = { label: string; to?: string };

export default function TournamentBreadcrumb({ tournamentName }: { tournamentName: string }) {
  const location = useLocation();
  const { divisions } = useTournamentTree();

  const crumbs = useMemo<Crumb[]>(() => {
    const selection = parseTreeSelection(location.pathname);
    if (!selection) return [];

    const { tournamentId } = selection;
    const trail: Crumb[] = [{ label: tournamentName || "Tournament", to: tournamentPagePath(tournamentId, "schedule") }];

    if (selection.page) {
      const page = TOURNAMENT_TREE_PAGES.find((candidate) => candidate.key === selection.page);
      trail.push({ label: page?.label ?? titleCase(selection.page) });
      return trail;
    }

    const division = divisions.find((candidate) => candidate.id === selection.divisionId);
    if (!division) return trail;
    trail.push({ label: division.name, to: divisionPath(tournamentId, division.id) });

    if (selection.divisionPage) {
      const page = DIVISION_TREE_PAGES.find((candidate) => candidate.key === selection.divisionPage);
      trail.push({ label: page?.label ?? titleCase(selection.divisionPage) });
      return trail;
    }

    const phase = division.phases.find((candidate) => candidate.id === selection.phaseId);
    if (!phase) return trail;
    trail.push({ label: phase.name, to: phasePath(tournamentId, division.id, phase.id) });

    const pool = poolsAreVisible(phase)
      ? (phase.phaseGroups ?? []).find((candidate) => candidate.id === selection.poolId)
      : undefined;
    if (pool) trail.push({ label: phaseGroupLabel(pool) });

    return trail;
  }, [location.pathname, divisions, tournamentName]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span className="text-ui-border-strong">/</span>}
            {isLast || !crumb.to ? (
              <span className="truncate font-semibold text-ui-text">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="truncate text-ui-text-mute transition-colors hover:text-ui-text">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
