import { StartggEventNode } from '../startgg.types';

export class GetEventBySlugResponse {
    event?: {
        id: string | number;
        name: string;
        slug?: string | null;
        tournament?: {
            id: string | number;
            name: string;
            slug?: string | null;
        } | null;
        phases?: Array<{
            id: string | number;
            name: string;
        }> | null;
    } | null;

    static map(data: GetEventBySlugResponse, slug: string): StartggEventNode {
        const event = data.event;
        if (!event?.id || !event?.name) {
            throw new Error('start.gg response did not contain an event');
        }

        return {
            id: String(event.id),
            name: event.name,
            slug: event.slug ?? slug,
            tournament: event.tournament?.id && event.tournament?.name
                ? {
                    id: String(event.tournament.id),
                    name: event.tournament.name,
                    slug: event.tournament.slug ?? null,
                }
                : null,
            phases: (event.phases ?? [])
                .filter((phase) => phase?.id && phase?.name)
                .map((phase) => ({
                    id: String(phase.id),
                    name: phase.name,
                })),
        };
    }
}
