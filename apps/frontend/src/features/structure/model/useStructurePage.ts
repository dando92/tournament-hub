import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { StructurePlan } from "@tournament-hub/contracts";

import { applyStructurePlan } from "@/features/structure/api/structure-plan.api";
import { buildStructureCanvas, poolKey, type CanvasSelection } from "@/features/structure/model/structureCanvas";
import {
    changeCount,
    emptyDraft,
    indexStructure,
    projectStructure,
    toStructurePlan,
    type StructureDraft,
} from "@/features/structure/model/structureDraft";
import { refsIn } from "@/features/structure/model/planReasons";
import { clearStructureDraft, readStructureDraft, writeStructureDraft } from "@/shared/lib/structureDraftStore";
import { listDivisionEntrants } from "@/features/division/api/division.api";
import { divisionKeys } from "@/features/division/api/division.keys";
import { listByDivision } from "@/features/match/api/match.api";
import { matchKeys } from "@/features/match/api/match.keys";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";
import { apiErrorMessages } from "@/shared/lib/apiError";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";

export function useStructurePage(tournamentId: number, divisions: TournamentDivisionOption[]) {
    const queryClient = useQueryClient();
    const tree = useTournamentTree();
    const [params, setParams] = useSearchParams();
    const [error, setError] = useState<string[] | null>(null);
    const [applying, setApplying] = useState(false);
    const [folded, setFolded] = useState<Set<string>>(new Set());

    const divisionId = Number(params.get("division")) || divisions[0]?.id || 0;
    const division = divisions.find((candidate) => candidate.id === divisionId);
    const structureVersion = division?.structureVersion ?? 0;

    const selection = readSelection(params.get("select"));

    const [draft, setDraft] = useState<StructureDraft>(() => readStructureDraft(tournamentId, divisionId) ?? emptyDraft(tournamentId, divisionId));

    useEffect(() => {
        if (draft.tournamentId === tournamentId && draft.divisionId === divisionId) {
            return;
        }
        setDraft(readStructureDraft(tournamentId, divisionId) ?? emptyDraft(tournamentId, divisionId));
    }, [tournamentId, divisionId, draft.tournamentId, draft.divisionId]);

    useEffect(() => {
        if (changeCount(draft) > 0) {
            writeStructureDraft(draft);
        } else {
            clearStructureDraft(draft.tournamentId, draft.divisionId);
        }
    }, [draft]);

    const matches = useQuery({
        queryKey: matchKeys.byDivision(divisionId),
        enabled: divisionId > 0,
        queryFn: () => listByDivision(divisionId),
    });

    const entrants = useQuery({
        queryKey: divisionKeys.entrants(divisionId),
        enabled: divisionId > 0,
        queryFn: () => listDivisionEntrants(divisionId),
    });

    const roster = useMemo(() => entrants.data ?? [], [entrants.data]);
    const faulted = useMemo(() => new Set((error ?? []).flatMap(refsIn)), [error]);
    const projected = useMemo(() => projectStructure(division, matches.data ?? [], draft, roster), [division, matches.data, draft, roster]);

    const canvas = useMemo(
        () => buildStructureCanvas({ division: projected.division, matches: projected.matches, selection, pending: projected.pending, folded, faulted }),
        [projected, selection, folded, faulted],
    );

    function setParam(key: string, value: string | null): void {
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (value === null) {
                    next.delete(key);
                } else {
                    next.set(key, value);
                }

                return next;
            },
            { replace: true },
        );
    }

    async function refresh(): Promise<void> {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: tournamentKeys.overview(tournamentId) }),
            queryClient.invalidateQueries({ queryKey: matchKeys.byDivision(divisionId) }),
            queryClient.invalidateQueries({ queryKey: divisionKeys.entrants(divisionId) }),
        ]);
    }

    async function apply(plan: StructurePlan): Promise<boolean> {
        setApplying(true);
        setError(null);
        try {
            await applyStructurePlan(tournamentId, plan);
            await refresh();

            return true;
        } catch (failure) {
            setError(apiErrorMessages(failure, "That change to the structure could not be saved."));

            return false;
        } finally {
            setApplying(false);
        }
    }

    async function commit(): Promise<boolean> {
        if (!division || changeCount(draft) === 0) {
            return true;
        }

        const tree = indexStructure(division, matches.data ?? [], draft);
        const written = await apply(toStructurePlan(draft, division.name, tree, structureVersion));
        if (written) {
            setDraft(emptyDraft(tournamentId, divisionId));
            select(null);
        }

        return written;
    }

    function select(next: CanvasSelection): void {
        setParam("select", next ? `${next.kind}:${next.id}` : null);
    }

    function toggleFold(poolId: number): void {
        setFolded((current) => {
            const next = new Set(current);
            if (!next.delete(poolKey(poolId))) {
                next.add(poolKey(poolId));
            }

            return next;
        });
    }

    function foldAll(shut: boolean): void {
        const pools = (projected.division?.phases ?? []).flatMap((phase) => phase.phaseGroups ?? []);
        setFolded(shut ? new Set(pools.map((pool) => poolKey(pool.id))) : new Set());
    }

    return {
        division: projected.division,
        divisionId,
        selection,
        canvas,
        matches: projected.matches,
        roster,
        loadingMatches: matches.isLoading,
        applying,
        error,
        faulted,
        draft,
        changes: changeCount(draft),
        folded,
        toggleFold,
        foldAll,
        edit: (next: (current: StructureDraft) => StructureDraft) => setDraft(next),
        commit,
        discard: () => setDraft(emptyDraft(tournamentId, divisionId)),
        dismissError: () => setError(null),
        selectDivision: (id: number) => setParam("division", String(id)),
        select,
        apply,
        refresh,
        tree,
    };
}

function readSelection(raw: string | null): CanvasSelection {
    if (!raw) {
        return null;
    }
    const [kind, id] = raw.split(":");
    if ((kind !== "pool" && kind !== "match" && kind !== "phase") || !Number(id)) {
        return null;
    }

    return { kind, id: Number(id) };
}
