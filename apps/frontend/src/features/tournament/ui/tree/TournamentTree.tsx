import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  faClockRotateLeft,
  faGear,
  faPenToSquare,
  faPlus,
  faSitemap,
  faThumbtack,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import TreeNode from "@/features/tournament/ui/tree/TreeNode";
import { DIVISION_TREE_PAGES, TOURNAMENT_TREE_PAGES } from "@/features/tournament/ui/tree/treePages";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";
import {
  getSidebarTournaments,
  groupSidebarTournaments,
  pinTournament,
  removeRecentTournament,
  type SidebarTournament,
  unpinTournament,
  type RecentTournament,
} from "@/shared/lib/recentTournaments";
import { divisionStatus, phaseStatus, poolStatus, tournamentStatus } from "@/features/tournament/model/treeStatus";
import {
  divisionPagePath,
  divisionPath,
  parseTreeSelection,
  phasePath,
  poolPath,
  tournamentPagePath,
} from "@/features/tournament/model/treeSelection";
import { phaseGroupLabel } from "@/features/division/model/phaseGroupLabel";
import { implicitPool, poolsAreVisible } from "@/features/division/model/poolVisibility";
import ContextMenu, { useContextMenu, type ContextMenuItem } from "@/shared/components/ui/ContextMenu";
import { treeNodeKey } from "@/shared/lib/treeState";
import { usePermissions } from "@/features/auth/model/PermissionContext";
import { useTournamentOverviewQuery } from "@/features/tournament/model/useTournamentOverviewQuery";
import type { TournamentDivisionOptionPhase } from "@/features/tournament/model/types";

export default function TournamentTree({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tree = useTournamentTree();
  const { canEditTournament } = usePermissions();
  const { menu, openMenu, closeMenu } = useContextMenu();

  const [tournaments, setTournaments] = useState<SidebarTournament[]>(getSidebarTournaments);
  const [openedTournamentId, setOpenedTournamentId] = useState<number | null>(tree.tournamentId);
  const selection = useMemo(() => parseTreeSelection(location.pathname), [location.pathname]);
  const previewTournamentId = openedTournamentId !== tree.tournamentId ? openedTournamentId : null;
  const previewQuery = useTournamentOverviewQuery(previewTournamentId);
  const tournamentGroups = useMemo(() => groupSidebarTournaments(tournaments), [tournaments]);

  useEffect(() => {
    setTournaments(getSidebarTournaments());
  }, [location.pathname]);

  const { expandNodes } = tree;
  useEffect(() => {
    if (!selection) return;
    setOpenedTournamentId(selection.tournamentId);
    const path = [treeNodeKey("tournament", selection.tournamentId)];
    if (selection.divisionId) path.push(treeNodeKey("division", selection.divisionId));
    if (selection.phaseId) path.push(treeNodeKey("phase", selection.phaseId));
    expandNodes(path);
  }, [selection, expandNodes]);

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const refreshTournaments = () => setTournaments(getSidebarTournaments());


  const tournamentMenu = (tournament: RecentTournament & { pinned: boolean }): ContextMenuItem[] => {
    const controls = canEditTournament(tournament.id);
    const isCurrent = tree.tournamentId === tournament.id;
    return [
      {
        key: "configuration",
        label: "Configuration",
        icon: faGear,
        hidden: !controls,
        onSelect: () => go(tournamentPagePath(tournament.id, "configuration")),
      },
      {
        key: "division",
        label: "New division",
        icon: faPlus,
        hidden: !controls || !isCurrent,
        onSelect: () => tree.openDialog({ kind: "createDivision" }),
      },
      {
        key: "pin",
        label: tournament.pinned ? "Unpin" : "Pin",
        icon: faThumbtack,
        onSelect: () => {
          if (tournament.pinned) unpinTournament(tournament.id);
          else pinTournament({ id: tournament.id, name: tournament.name, logo: tournament.logo });
          refreshTournaments();
        },
      },
      {
        key: "forget",
        label: "Remove from recents",
        icon: faXmark,
        hidden: tournament.pinned,
        onSelect: () => {
          removeRecentTournament(tournament.id);
          refreshTournaments();
        },
      },
    ];
  };

  const divisionMenu = (divisionId: number, name: string): ContextMenuItem[] => [
    {
      key: "phase",
      label: "New phase",
      icon: faPlus,
      onSelect: () => tree.openDialog({ kind: "createPhase", divisionId }),
    },
    {
      key: "rename",
      label: "Rename division",
      icon: faPenToSquare,
      onSelect: () =>
        tree.openDialog({
          kind: "rename",
          noun: "division",
          currentName: name,
          apply: (next) => tree.renameDivisionNode(divisionId, next),
        }),
    },
    {
      key: "delete",
      label: "Delete division",
      icon: faTrash,
      danger: true,
      onSelect: () => tree.removeDivision(divisionId),
      confirm: {
        message: `Delete division "${name}"? Its phases, pools and matches are deleted with it, and this cannot be undone.`,
        confirmText: "Delete division",
      },
    },
  ];

  const phaseMenu = (divisionId: number, phase: TournamentDivisionOptionPhase): ContextMenuItem[] => [
    {
      key: "pool",
      label: "New pool",
      icon: faPlus,
      onSelect: () => tree.openDialog({ kind: "createPool", phaseId: phase.id }),
    },
    {
      key: "advancement",
      label: "Advancement rules",
      icon: faSitemap,
      hidden: !implicitPool(phase),
      onSelect: () => {
        const pool = implicitPool(phase);
        if (!pool) return;
        go(`${poolPath(tree.tournamentId ?? 0, divisionId, phase.id, pool.id)}?edit=advancement`);
      },
    },
    {
      key: "rename",
      label: "Rename phase",
      icon: faPenToSquare,
      onSelect: () =>
        tree.openDialog({
          kind: "rename",
          noun: "phase",
          currentName: phase.name,
          apply: (next) => tree.renamePhaseNode(phase.id, next),
        }),
    },
    {
      key: "delete",
      label: "Delete phase",
      icon: faTrash,
      danger: true,
      onSelect: () => tree.removePhase(phase.id),
      confirm: {
        message: `Delete phase "${phase.name}"? Its pools and their matches are deleted with it, and this cannot be undone.`,
        confirmText: "Delete phase",
      },
    },
  ];

  const poolMenu = (
    divisionId: number,
    phaseId: number,
    poolId: number,
    name: string,
  ): ContextMenuItem[] => [
    {
      key: "advancement",
      label: "Advancement rules",
      icon: faSitemap,
      onSelect: () =>
        go(`${poolPath(tree.tournamentId ?? 0, divisionId, phaseId, poolId)}?edit=advancement`),
    },
    {
      key: "rename",
      label: "Rename pool",
      icon: faPenToSquare,
      onSelect: () =>
        tree.openDialog({
          kind: "rename",
          noun: "pool",
          currentName: name,
          apply: (next) => tree.renamePoolNode(poolId, next),
        }),
    },
    {
      key: "delete",
      label: "Delete pool",
      icon: faTrash,
      danger: true,
      onSelect: () => tree.removePool(poolId),
      confirm: {
        message: `Delete pool "${name}"? Its matches are deleted with it, and this cannot be undone.`,
        confirmText: "Delete pool",
      },
    },
  ];


  if (tournaments.length === 0) {
    return <p className="px-3 py-6 text-center text-xs italic text-ui-text-mute">No tournaments yet.</p>;
  }

  const tournamentSections = [
    {
      key: "pinned" as const,
      label: "Pinned",
      icon: faThumbtack,
      tournaments: tournamentGroups.pinned,
    },
    {
      key: "recent" as const,
      label: "Recents",
      icon: faClockRotateLeft,
      tournaments: tournamentGroups.recent,
    },
  ].filter((section) => section.tournaments.length > 0);

  return (
    <>
      <div role="tree" aria-label="Tournaments" className="flex flex-col gap-3">
        {tournamentSections.map((section) => (
          <div key={section.key} role="group" aria-label={section.label} className="flex flex-col gap-0.5">
            <TreeNode
              label={section.label}
              depth={0}
              icon={section.icon}
              expandable
              expanded={!tree.isTournamentSectionCollapsed(section.key)}
              strong
              onActivate={() => tree.toggleTournamentSection(section.key)}
            />
            {!tree.isTournamentSectionCollapsed(section.key) &&
              section.tournaments.map((tournament) => {
                const key = treeNodeKey("tournament", tournament.id);
                const isCurrent = tree.tournamentId === tournament.id;
                const expanded = openedTournamentId === tournament.id && tree.isExpanded(key);
                const canControlTournament = canEditTournament(tournament.id);
                const controls = isCurrent && canControlTournament;
                const divisions = isCurrent
                  ? tree.divisions
                  : openedTournamentId === tournament.id
                    ? previewQuery.data ?? []
                    : [];
                const rolledUpStatus = expanded ? tournamentStatus(divisions) : undefined;

                return (
                  <div key={tournament.id} className="flex flex-col gap-0.5">
                    <TreeNode
                      label={tournament.name}
                      depth={1}
                      strong
                      status={rolledUpStatus}
                      expandable
                      expanded={expanded}
                      selected={Boolean(
                        selection && selection.tournamentId === tournament.id && !selection.page && !selection.divisionId,
                      )}
                      onActivate={(deep) => {
                        if (expanded) {
                          tree.toggleNode(key, deep);
                          return;
                        }
                        setOpenedTournamentId(tournament.id);
                        tree.expandNode(key);
                      }}
                      onOpenMenu={(x, y) => openMenu(x, y, tournament.name, tournamentMenu(tournament))}
                      extraAction={
                        canControlTournament
                          ? {
                              icon: faGear,
                              title: "Configuration",
                              onSelect: () => go(tournamentPagePath(tournament.id, "configuration")),
                            }
                          : undefined
                      }
                    />

                    {expanded && (
                      <>
                        {TOURNAMENT_TREE_PAGES.filter((page) => !page.requiresControl || controls).map((page) => (
                          <TreeNode
                            key={page.key}
                            label={page.label}
                            depth={2}
                            icon={page.icon}
                            selected={selection?.page === page.key}
                            onActivate={() => go(tournamentPagePath(tournament.id, page.key))}
                          />
                        ))}

                        {divisions.map((division) => {
                          const divisionKey = treeNodeKey("division", division.id);
                          const divisionExpanded = tree.isExpanded(divisionKey);
                          return (
                            <div key={division.id} className="flex flex-col gap-0.5">
                              <TreeNode
                                label={division.name}
                                depth={2}
                                status={divisionStatus(division)}
                                expandable
                                expanded={divisionExpanded}
                                selected={
                                  selection?.divisionId === division.id && !selection.phaseId && !selection.divisionPage
                                }
                                onActivate={(deep) => {
                                  tree.toggleNode(divisionKey, deep);
                                  go(divisionPath(tournament.id, division.id));
                                }}
                                onToggle={() => tree.toggleNode(divisionKey, false)}
                                onOpenMenu={
                                  controls
                                    ? (x, y) => openMenu(x, y, division.name, divisionMenu(division.id, division.name))
                                    : undefined
                                }
                              />

                              {divisionExpanded && (
                                <>
                                  {DIVISION_TREE_PAGES.filter((page) => !page.requiresControl || controls).map((page) => (
                                    <TreeNode
                                      key={page.key}
                                      label={page.label}
                                      depth={3}
                                      icon={page.icon}
                                      selected={
                                        selection?.divisionId === division.id && selection.divisionPage === page.key
                                      }
                                      onActivate={() => go(divisionPagePath(tournament.id, division.id, page.key))}
                                    />
                                  ))}

                                  {division.phases.map((phase) => {
                                    const phaseKey = treeNodeKey("phase", phase.id);
                                    const poolsShown = poolsAreVisible(phase);
                                    const phaseExpanded = poolsShown && tree.isExpanded(phaseKey);
                                    return (
                                      <div key={phase.id} className="flex flex-col gap-0.5">
                                        <TreeNode
                                          label={phase.name}
                                          depth={3}
                                          status={phaseStatus(phase)}
                                          expandable={poolsShown}
                                          expanded={phaseExpanded}
                                          count={poolsShown ? undefined : phase.matchCount}
                                          selected={selection?.phaseId === phase.id && (!selection.poolId || !poolsShown)}
                                          onActivate={(deep) => {
                                            if (poolsShown) tree.toggleNode(phaseKey, deep);
                                            go(phasePath(tournament.id, division.id, phase.id));
                                          }}
                                          onToggle={poolsShown ? () => tree.toggleNode(phaseKey, false) : undefined}
                                          onOpenMenu={
                                            controls
                                              ? (x, y) => openMenu(x, y, phase.name, phaseMenu(division.id, phase))
                                              : undefined
                                          }
                                        />

                                        {phaseExpanded &&
                                          (phase.phaseGroups ?? []).map((pool) => (
                                            <TreeNode
                                              key={pool.id}
                                              label={phaseGroupLabel(pool)}
                                              depth={4}
                                              status={poolStatus(pool)}
                                              count={pool.matchCount}
                                              selected={selection?.poolId === pool.id}
                                              onActivate={() =>
                                                go(poolPath(tournament.id, division.id, phase.id, pool.id))
                                              }
                                              onOpenMenu={
                                                controls
                                                  ? (x, y) =>
                                                      openMenu(
                                                        x,
                                                        y,
                                                        phaseGroupLabel(pool),
                                                        poolMenu(
                                                          division.id,
                                                          phase.id,
                                                          pool.id,
                                                          phaseGroupLabel(pool),
                                                        ),
                                                      )
                                                  : undefined
                                              }
                                            />
                                          ))}
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      <ContextMenu state={menu} onClose={closeMenu} />
    </>
  );
}
