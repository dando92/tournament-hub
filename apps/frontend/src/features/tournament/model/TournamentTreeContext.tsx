import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { TournamentDivisionOption } from "@/features/tournament/model/types";
import { useTournamentOverviewQuery } from "@/features/tournament/model/useTournamentOverviewQuery";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";
import { createDivision, deleteDivision, renameDivision } from "@/features/division/api/division.api";
import { createPhase, deletePhase, updatePhase } from "@/features/division/api/phase.api";
import { createPhaseGroup, deletePhaseGroup, updatePhaseGroup } from "@/features/division/api/phase-group.api";
import {
  getCollapsedTournamentSections,
  getExpandedNodes,
  setCollapsedTournamentSections,
  setExpandedNodes,
  treeNodeKey,
  type TournamentSectionKey,
} from "@/shared/lib/treeState";
import TournamentStructureModals from "@/features/tournament/ui/tree/TournamentStructureModals";
import { usePageNotices } from "@/shared/context/PageNoticeContext";


export type StructureDialog =
  | { kind: "none" }
  | { kind: "createDivision" }
  | { kind: "createPhase"; divisionId?: number }
  | { kind: "createPool"; phaseId: number }
  | { kind: "generateBracket"; divisionId?: number; phaseId?: number }
  | { kind: "startggImport" }
  | { kind: "rename"; noun: string; currentName: string; apply: (name: string) => Promise<void> };

type TournamentTreeContextValue = {
  tournamentId: number | null;
  tournamentName: string;
  controls: boolean;
  divisions: TournamentDivisionOption[];
  loading: boolean;
  refreshTree: () => Promise<void>;

  isExpanded: (key: string) => boolean;
  toggleNode: (key: string, deep?: boolean) => void;
  expandNode: (key: string) => void;
  expandNodes: (keys: string[]) => void;
  collapseAll: () => void;
  isTournamentSectionCollapsed: (key: TournamentSectionKey) => boolean;
  toggleTournamentSection: (key: TournamentSectionKey) => void;

  dialog: StructureDialog;
  openDialog: (dialog: StructureDialog) => void;
  closeDialog: () => void;

  createPool: (phaseId: number, name: string) => Promise<void>;
  removeDivision: (divisionId: number) => Promise<void>;
  removePhase: (phaseId: number) => Promise<void>;
  removePool: (phaseGroupId: number) => Promise<void>;
  renameDivisionNode: (divisionId: number, name: string) => Promise<void>;
  renamePhaseNode: (phaseId: number, name: string) => Promise<void>;
  renamePoolNode: (phaseGroupId: number, name: string) => Promise<void>;
  addDivision: (name: string) => Promise<void>;
  addPhase: (divisionId: number, name: string) => Promise<void>;
};

const defaultValue: TournamentTreeContextValue = {
  tournamentId: null,
  tournamentName: "",
  controls: false,
  divisions: [],
  loading: false,
  refreshTree: async () => {},
  isExpanded: () => false,
  toggleNode: () => {},
  expandNode: () => {},
  expandNodes: () => {},
  collapseAll: () => {},
  isTournamentSectionCollapsed: () => false,
  toggleTournamentSection: () => {},
  dialog: { kind: "none" },
  openDialog: () => {},
  closeDialog: () => {},
  createPool: async () => {},
  removeDivision: async () => {},
  removePhase: async () => {},
  removePool: async () => {},
  renameDivisionNode: async () => {},
  renamePhaseNode: async () => {},
  renamePoolNode: async () => {},
  addDivision: async () => {},
  addPhase: async () => {},
};

const TournamentTreeContext = createContext<TournamentTreeContextValue>(defaultValue);

export function TournamentTreeProvider({
  tournamentId,
  tournamentName,
  controls,
  children,
}: {
  tournamentId: number | null;
  tournamentName: string;
  controls: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { report, dismiss } = usePageNotices();
  const query = useTournamentOverviewQuery(tournamentId);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(getExpandedNodes);
  const [collapsedTournamentSections, setCollapsedTournamentSectionsState] = useState<ReadonlySet<TournamentSectionKey>>(getCollapsedTournamentSections);
  const [dialog, setDialog] = useState<StructureDialog>({ kind: "none" });

  const divisions = useMemo(() => query.data ?? [], [query.data]);

  const refreshTree = useCallback(async () => {
    if (tournamentId === null) return;
    await queryClient.invalidateQueries({ queryKey: tournamentKeys.overview(tournamentId) });
  }, [queryClient, tournamentId]);


  const firstPersist = useRef(true);
  useEffect(() => {
    if (firstPersist.current) {
      firstPersist.current = false;
      return;
    }
    setExpandedNodes(expanded);
  }, [expanded]);

  useEffect(() => {
    setCollapsedTournamentSections(collapsedTournamentSections);
  }, [collapsedTournamentSections]);

  const isExpanded = useCallback((key: string) => expanded.has(key), [expanded]);

  const descendantKeys = useCallback(
    (key: string): string[] => {
      const [kind, rawId] = key.split(":");
      const id = Number(rawId);
      if (kind === "tournament") {
        return divisions.flatMap((division) => [
          treeNodeKey("division", division.id),
          ...division.phases.map((phase) => treeNodeKey("phase", phase.id)),
        ]);
      }
      if (kind === "division") {
        const division = divisions.find((candidate) => candidate.id === id);
        return (division?.phases ?? []).map((phase) => treeNodeKey("phase", phase.id));
      }
      return [];
    },
    [divisions],
  );

  const toggleNode = useCallback(
    (key: string, deep = false) => {
      setExpanded((current) => {
        const opening = !current.has(key);
        const keys = deep ? [key, ...descendantKeys(key)] : [key];
        const next = new Set(current);
        keys.forEach((candidate) => (opening ? next.add(candidate) : next.delete(candidate)));
        return next;
      });
    },
    [descendantKeys],
  );

  const expandNodes = useCallback((keys: string[]) => {
    setExpanded((current) => {
      if (keys.every((key) => current.has(key))) return current;
      const next = new Set(current);
      keys.forEach((key) => next.add(key));
      return next;
    });
  }, []);

  const expandNode = useCallback((key: string) => expandNodes([key]), [expandNodes]);

  const isTournamentSectionCollapsed = useCallback(
    (key: TournamentSectionKey) => collapsedTournamentSections.has(key),
    [collapsedTournamentSections],
  );

  const toggleTournamentSection = useCallback((key: TournamentSectionKey) => {
    setCollapsedTournamentSectionsState((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
    setCollapsedTournamentSectionsState(new Set(["pinned", "recent"]));
  }, []);


  const run = useCallback(
    async (work: () => Promise<void>, failure: string) => {
      try {
        await work();
        dismiss(failure);
      } catch {
        report(failure);
      }
    },
    [report, dismiss],
  );

  const addDivision = useCallback(
    async (name: string) => {
      if (tournamentId === null) throw new Error("No tournament is open.");
      await createDivision(tournamentId, name);
    },
    [tournamentId],
  );

  const addPhase = useCallback(
    async (divisionId: number, name: string) => {
      await createPhase(divisionId, name);
      expandNode(treeNodeKey("division", divisionId));
    },
    [expandNode],
  );

  const createPool = useCallback(
    async (phaseId: number, name: string) => {
      await createPhaseGroup(phaseId, { name, displayIdentifier: name });
      expandNode(treeNodeKey("phase", phaseId));
    },
    [expandNode],
  );

  const removeDivision = useCallback(
    async (divisionId: number) => {
      await run(
        async () => {
          await deleteDivision(divisionId);
        },
        "Error deleting division.",
      );
      if (tournamentId !== null) navigate(`/tournament/${tournamentId}/schedule`);
    },
    [run, navigate, tournamentId],
  );

  const removePhase = useCallback(
    async (phaseId: number) => {
      await run(
        async () => {
          await deletePhase(phaseId);
        },
        "Error deleting phase.",
      );
    },
    [run],
  );

  const removePool = useCallback(
    async (phaseGroupId: number) => {
      await run(
        async () => {
          await deletePhaseGroup(phaseGroupId);
        },
        "Error deleting pool.",
      );
    },
    [run],
  );

  const renameDivisionNode = useCallback(
    async (divisionId: number, name: string) => {
      await renameDivision(divisionId, name);
    },
    [],
  );

  const renamePhaseNode = useCallback(
    async (phaseId: number, name: string) => {
      await updatePhase(phaseId, { name });
    },
    [],
  );

  const renamePoolNode = useCallback(
    async (phaseGroupId: number, name: string) => {
      await updatePhaseGroup(phaseGroupId, { name, displayIdentifier: name });
    },
    [],
  );

  const openDialog = useCallback((next: StructureDialog) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog({ kind: "none" }), []);

  const value = useMemo<TournamentTreeContextValue>(
    () => ({
      tournamentId,
      tournamentName,
      controls,
      divisions,
      loading: query.isLoading,
      refreshTree,
      isExpanded,
      toggleNode,
      expandNode,
      expandNodes,
      collapseAll,
      isTournamentSectionCollapsed,
      toggleTournamentSection,
      dialog,
      openDialog,
      closeDialog,
      createPool,
      removeDivision,
      removePhase,
      removePool,
      renameDivisionNode,
      renamePhaseNode,
      renamePoolNode,
      addDivision,
      addPhase,
    }),
    [
      tournamentId,
      tournamentName,
      controls,
      divisions,
      query.isLoading,
      refreshTree,
      isExpanded,
      toggleNode,
      expandNode,
      expandNodes,
      collapseAll,
      isTournamentSectionCollapsed,
      toggleTournamentSection,
      dialog,
      openDialog,
      closeDialog,
      createPool,
      removeDivision,
      removePhase,
      removePool,
      renameDivisionNode,
      renamePhaseNode,
      renamePoolNode,
      addDivision,
      addPhase,
    ],
  );

  return (
    <TournamentTreeContext.Provider value={value}>
      {children}
      <TournamentStructureModals />
    </TournamentTreeContext.Provider>
  );
}

export function useTournamentTree() {
  return useContext(TournamentTreeContext);
}
