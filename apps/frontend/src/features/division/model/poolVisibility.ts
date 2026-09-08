import type { PhaseGroup } from "@/features/division/model/types";
import { phaseGroupLabel } from "@/features/division/model/phaseGroupLabel";


type PhaseWithPools = {
    name: string;
    phaseGroups?: PhaseGroup[];
};

export function implicitPool(phase: PhaseWithPools | undefined | null): PhaseGroup | undefined {
    const pools = phase?.phaseGroups ?? [];

    return pools.length === 1 ? pools[0] : undefined;
}

export function poolsAreVisible(phase: PhaseWithPools | undefined | null): boolean {
    return (phase?.phaseGroups?.length ?? 0) > 1;
}

export function poolLabelIn(phase: PhaseWithPools | undefined | null, pool: PhaseGroup): string {
    if (phase && implicitPool(phase)?.id === pool.id) return phase.name;

    return phaseGroupLabel(pool);
}

export const FIRST_POOL_NAME = "Pool";

export function nextPoolName(phase: PhaseWithPools | undefined | null): string {
    const taken = new Set((phase?.phaseGroups ?? []).map((pool) => phaseGroupLabel(pool)));
    let number = (phase?.phaseGroups?.length ?? 0) + 1;
    while (taken.has(`Pool ${number}`)) number += 1;

    return `Pool ${number}`;
}
