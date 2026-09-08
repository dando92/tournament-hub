import { StartggEntrantNode } from '../startgg.types';
import { PageInfo } from './page-info.response';

export class EventEntrantsResponse {
    event?: {
        entrants?: {
            pageInfo?: PageInfo | null;
            nodes?: Array<{
                id: string | number;
                name?: string | null;
                participants?: Array<{
                    id: string | number;
                    gamerTag?: string | null;
                }> | null;
            }> | null;
        } | null;
    } | null;

    static mapPage(data: EventEntrantsResponse): { pageInfo: PageInfo; nodes: StartggEntrantNode[] } {
        const entrants = data.event?.entrants;
        return {
            pageInfo: entrants?.pageInfo ?? {},
            nodes: (entrants?.nodes ?? [])
                .filter((entrant) => entrant?.id)
                .map((entrant) => {
                    const participants = (entrant.participants ?? [])
                        .filter((participant) => participant?.id && participant?.gamerTag)
                        .map((participant) => ({
                            id: String(participant.id),
                            gamerTag: String(participant.gamerTag),
                            entrantId: String(entrant.id),
                        }));
                    return {
                        id: String(entrant.id),
                        name: entrant.name?.trim() || participants.map((participant) => participant.gamerTag).join(' / ') || `Entrant ${entrant.id}`,
                        participants,
                    };
                }),
        };
    }
}
