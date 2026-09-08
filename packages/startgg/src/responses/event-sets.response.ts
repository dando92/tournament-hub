import { StartggSetNode } from '../startgg.types';
import { PageInfo } from './page-info.response';
import { StartggRawSetResponse, StartggRawSetNode } from './raw-set-node.response';

export class EventSetsResponse {
    event?: {
        sets?: {
            pageInfo?: PageInfo | null;
            nodes?: StartggRawSetNode[] | null;
        } | null;
    } | null;

    static mapPage(data: EventSetsResponse): { pageInfo: PageInfo; nodes: StartggSetNode[] } {
        const sets = data.event?.sets;
        return {
            pageInfo: sets?.pageInfo ?? {},
            nodes: (sets?.nodes ?? [])
                .filter((set) => set?.id)
                .map((set) => StartggRawSetResponse.map(set)),
        };
    }
}
