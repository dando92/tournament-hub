import { StartggPhaseGroupNode } from '../startgg.types';
import { PageInfo } from './page-info.response';

export class PhaseGroupsByPhaseResponse {
    phase?: {
        id?: string | number;
        name?: string | null;
        phaseGroups?: {
            pageInfo?: PageInfo | null;
            nodes?: Array<{
                id: string | number;
                displayIdentifier?: string | null;
                bracketType?: string | null;
            }> | null;
        } | null;
    } | null;

    static mapPage(
        data: PhaseGroupsByPhaseResponse,
        fallbackPhaseId: string,
    ): { pageInfo: PageInfo; nodes: StartggPhaseGroupNode[] } {
        const phase = data.phase;
        const phaseGroups = phase?.phaseGroups;
        return {
            pageInfo: phaseGroups?.pageInfo ?? {},
            nodes: (phaseGroups?.nodes ?? [])
                .filter((phaseGroup) => phaseGroup?.id)
                .map((phaseGroup) => ({
                    id: String(phaseGroup.id),
                    displayIdentifier: phaseGroup.displayIdentifier ?? null,
                    bracketType: phaseGroup.bracketType ?? null,
                    phaseId: String(phase?.id ?? fallbackPhaseId),
                    phaseName: phase?.name ?? null,
                    sets: [],
                })),
        };
    }
}
