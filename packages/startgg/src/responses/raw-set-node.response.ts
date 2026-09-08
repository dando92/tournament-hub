import { StartggPhaseGroupNode, StartggSetNode } from '../startgg.types';

export type StartggRawSetNode = {
    id: string | number;
    fullRoundText?: string | null;
    state?: number | string | null;
    completedAt?: number | null;
    winnerId?: string | number | null;
    phaseGroup?: {
        displayIdentifier?: string | null;
        phase?: {
            id?: string | number;
            name?: string | null;
        } | null;
    } | null;
    slots?: Array<{
        prereqId?: string | null;
        prereqPlacement?: number | null;
        prereqType?: string | null;
        entrant?: {
            id: string | number;
            name?: string | null;
        } | null;
        standing?: {
            placement?: number | null;
            stats?: {
                score?: {
                    value?: number | null;
                } | null;
            } | null;
        } | null;
    }> | null;
};

export class StartggRawSetResponse {
    static map(
        set: StartggRawSetNode,
        phaseGroup?: StartggPhaseGroupNode,
    ): StartggSetNode {
        return {
            id: String(set.id),
            fullRoundText: set.fullRoundText ?? null,
            state: set.state ?? null,
            completedAt: set.completedAt ?? null,
            winnerId: set.winnerId ? String(set.winnerId) : null,
            phaseGroupId: phaseGroup?.id ?? null,
            phaseId: phaseGroup?.phaseId ?? (set.phaseGroup?.phase?.id ? String(set.phaseGroup.phase.id) : null),
            phaseName: phaseGroup?.phaseName ?? set.phaseGroup?.phase?.name ?? null,
            phaseGroupName: phaseGroup?.displayIdentifier ?? set.phaseGroup?.displayIdentifier ?? null,
            slots: (set.slots ?? []).map((slot) => ({
                prereqId: slot?.prereqId ? String(slot.prereqId) : null,
                prereqPlacement: slot?.prereqPlacement ?? null,
                prereqType: slot?.prereqType ?? null,
                entrant: slot?.entrant?.id ? {
                    id: String(slot.entrant.id),
                    name: slot.entrant.name?.trim() || `Entrant ${slot.entrant.id}`,
                } : null,
                standing: slot?.standing ? {
                    placement: slot.standing.placement ?? null,
                    score: slot.standing.stats?.score?.value ?? null,
                } : null,
            })),
            entrants: (set.slots ?? [])
                .filter((slot) => slot?.entrant?.id)
                .map((slot) => ({
                    id: String(slot!.entrant!.id),
                    name: slot!.entrant!.name?.trim() || `Entrant ${slot!.entrant!.id}`,
                })),
        };
    }
}
