import { StartggPhaseGroupNode, StartggSetNode } from '../startgg.types';
import { PageInfo } from './page-info.response';
import { StartggRawSetNode, StartggRawSetResponse } from './raw-set-node.response';

export class PhaseGroupSetsResponse {
    phaseGroup?: {
        id?: string | number;
        displayIdentifier?: string | null;
        sets?: {
            pageInfo?: PageInfo | null;
            nodes?: StartggRawSetNode[] | null;
        } | null;
    } | null;

    static mapPage(
        data: PhaseGroupSetsResponse,
        phaseGroup: StartggPhaseGroupNode,
    ): { pageInfo: PageInfo; nodes: StartggSetNode[] } {
        const sets = data.phaseGroup?.sets;
        return {
            pageInfo: sets?.pageInfo ?? {},
            nodes: (sets?.nodes ?? [])
                .filter((set) => set?.id)
                .map((set) => StartggRawSetResponse.map(set, phaseGroup)),
        };
    }
}
