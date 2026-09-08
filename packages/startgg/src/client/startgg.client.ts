import {
    BadGatewayException,
    HttpException,
    Injectable,
    Logger,
} from '@nestjs/common';
import {
    EventEntrantsResponse,
    EventSetsResponse,
    GetEventBySlugResponse,
    PageInfo,
    PhaseGroupsByPhaseResponse,
    PhaseGroupSetsResponse,
    PhaseSeedsResponse,
} from '../responses';
import {
    StartggEntrantNode,
    StartggBracketSetGameDataInput,
    StartggEventNode,
    StartggPhaseGroupNode,
    StartggReportedSetNode,
    StartggSeedNode,
    StartggSetNode,
} from '../startgg.types';
import { EVENT_ENTRANTS_QUERY } from '../operations/queries/event-entrants.query';
import { EVENT_SETS_QUERY } from '../operations/queries/event-sets.query';
import { GET_EVENT_BY_SLUG_QUERY } from '../operations/queries/get-event-by-slug.query';
import { PHASE_GROUPS_BY_PHASE_QUERY } from '../operations/queries/phase-groups-by-phase.query';
import { PHASE_GROUP_SETS_QUERY } from '../operations/queries/phase-group-sets.query';
import { PHASE_SEEDS_QUERY } from '../operations/queries/phase-seeds.query';
import { REPORT_BRACKET_SET_MUTATION } from '../operations/queries/report-bracket-set.mutation';

type GraphqlResponse<T> = {
    data?: T;
    errors?: Array<{ message?: string }>;
};

type ReportBracketSetResponse = {
    reportBracketSet?: StartggReportedSetNode[] | null;
};

export interface StartggClientOptions {
    endpoint?: string;
    perPage?: number;
    minIntervalMs?: number;
}

@Injectable()
export class StartggClient {
    private readonly logger = new Logger(StartggClient.name);
    private readonly endpoint: string;
    private readonly perPage: number;
    private readonly minIntervalMs: number;
    private lastRequestAt = 0;

    constructor(options: StartggClientOptions = {}) {
        this.endpoint = options.endpoint ?? 'https://api.start.gg/gql/alpha';
        this.perPage = options.perPage ?? 64;
        this.minIntervalMs = options.minIntervalMs ?? 1000;
    }

    async getEventBySlug(slug: string, accessToken: string): Promise<StartggEventNode> {
        const response = await this.request<GetEventBySlugResponse>(
            'GetEventBySlug',
            GET_EVENT_BY_SLUG_QUERY,
            { slug },
            accessToken,
        );
        try {
            return GetEventBySlugResponse.map(response, slug);
        } catch (error) {
            throw new BadGatewayException(error instanceof Error ? error.message : 'start.gg response did not contain an event');
        }
    }

    async getEventEntrants(eventId: string, accessToken: string): Promise<StartggEntrantNode[]> {
        return this.paginate<StartggEntrantNode>(
            `event:${eventId}:entrants`,
            async (page, perPage) => {
                const response = await this.request<EventEntrantsResponse>(
                    'EventEntrants',
                    EVENT_ENTRANTS_QUERY,
                    { eventId, page, perPage },
                    accessToken,
                );
                return EventEntrantsResponse.mapPage(response);
            },
        );
    }

    async getPhaseSeeds(phaseId: string, accessToken: string): Promise<StartggSeedNode[]> {
        return this.paginate<StartggSeedNode>(
            `phase:${phaseId}:seeds`,
            async (page, perPage) => {
                const response = await this.request<PhaseSeedsResponse>(
                    'PhaseSeeds',
                    PHASE_SEEDS_QUERY,
                    { phaseId, page, perPage },
                    accessToken,
                );
                return PhaseSeedsResponse.mapPage(response);
            },
        );
    }

    async getEventSets(eventId: string, accessToken: string): Promise<StartggSetNode[]> {
        return this.paginate<StartggSetNode>(
            `event:${eventId}:sets`,
            async (page, perPage) => {
                const response = await this.request<EventSetsResponse>(
                    'EventSets',
                    EVENT_SETS_QUERY,
                    { eventId, page, perPage },
                    accessToken,
                );
                return EventSetsResponse.mapPage(response);
            },
        );
    }

    async getPhaseGroups(phaseId: string, accessToken: string): Promise<StartggPhaseGroupNode[]> {
        return this.paginate<StartggPhaseGroupNode>(
            `phase:${phaseId}:phaseGroups`,
            async (page, perPage) => {
                const response = await this.request<PhaseGroupsByPhaseResponse>(
                    'PhaseGroupsByPhase',
                    PHASE_GROUPS_BY_PHASE_QUERY,
                    { phaseId, page, perPage },
                    accessToken,
                );
                return PhaseGroupsByPhaseResponse.mapPage(response, phaseId);
            },
        );
    }

    async getPhaseGroupSets(phaseGroup: StartggPhaseGroupNode, accessToken: string): Promise<StartggSetNode[]> {
        return this.paginate<StartggSetNode>(
            `phaseGroup:${phaseGroup.id}:sets`,
            async (page, perPage) => {
                const response = await this.request<PhaseGroupSetsResponse>(
                    'PhaseGroupSets',
                    PHASE_GROUP_SETS_QUERY,
                    { phaseGroupId: phaseGroup.id, page, perPage },
                    accessToken,
                );
                return PhaseGroupSetsResponse.mapPage(response, phaseGroup);
            },
        );
    }

    async reportBracketSet(
        setId: string,
        winnerId: string,
        accessToken: string,
        gameData?: StartggBracketSetGameDataInput[],
    ): Promise<StartggReportedSetNode[]> {
        const response = await this.request<ReportBracketSetResponse>(
            'ReportBracketSet',
            REPORT_BRACKET_SET_MUTATION,
            { setId, winnerId, gameData },
            accessToken,
        );
        return response.reportBracketSet ?? [];
    }

    private async request<T>(operationName: string, query: string, variables: Record<string, unknown>, accessToken: string): Promise<T> {
        const throttleWaitMs = await this.throttle();

        const maxAttempts = 4;
        let attempt = 0;
        let delayMs = 1000;

        while (attempt < maxAttempts) {
            attempt += 1;
            const requestStartedAt = Date.now();

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    query,
                    variables,
                }),
            });

            this.logger.log(
                `[timing] request operation=${operationName} attempt=${attempt} status=${response.status} durationMs=${Date.now() - requestStartedAt} throttleWaitMs=${throttleWaitMs}`,
            );

            if (response.status === 429) {
                if (attempt >= maxAttempts) {
                    throw new HttpException('start.gg rate limit exceeded', 429);
                }
                await this.sleep(delayMs);
                delayMs *= 2;
                continue;
            }

            if (!response.ok) {
                const body = await response.text();
                if (response.status >= 500 && attempt < maxAttempts) {
                    await this.sleep(delayMs);
                    delayMs *= 2;
                    continue;
                }
                throw new BadGatewayException(`start.gg request failed with status ${response.status}: ${body}`);
            }

            const json = await response.json() as GraphqlResponse<T>;
            if (json.errors?.length) {
                const message = json.errors.map((error) => error.message).filter(Boolean).join('; ') || 'Unknown start.gg GraphQL error';
                throw new BadGatewayException(message);
            }

            if (!json.data) {
                throw new BadGatewayException('start.gg response was missing data');
            }

            return json.data;
        }

        throw new BadGatewayException('start.gg request failed');
    }

    private async paginate<T>(
        label: string,
        fetchPage: (page: number, perPage: number) => Promise<{ pageInfo: PageInfo; nodes: T[] }>,
    ): Promise<T[]> {
        const nodes: T[] = [];
        let page = 1;
        let totalPages = 1;
        const startedAt = Date.now();

        while (page <= totalPages) {
            const pageStartedAt = Date.now();
            const { pageInfo, nodes: pageNodes } = await fetchPage(page, this.perPage);
            nodes.push(...pageNodes);

            if (pageInfo.totalPages) {
                totalPages = pageInfo.totalPages;
            } else if (pageInfo.total !== undefined) {
                totalPages = Math.max(1, Math.ceil(pageInfo.total / this.perPage));
            } else {
                totalPages = page;
            }

            this.logger.log(
                `[timing] paginate label=${label} page=${page}/${totalPages} pageNodes=${pageNodes.length} accumulatedNodes=${nodes.length} durationMs=${Date.now() - pageStartedAt}`,
            );

            page += 1;
        }

        this.logger.log(
            `[timing] paginate-complete label=${label} pages=${Math.max(0, page - 1)} totalNodes=${nodes.length} durationMs=${Date.now() - startedAt}`,
        );

        return nodes;
    }

    private async throttle(): Promise<number> {
        const now = Date.now();
        const waitMs = this.lastRequestAt + this.minIntervalMs - now;
        if (waitMs > 0) {
            await this.sleep(waitMs);
        }
        this.lastRequestAt = Date.now();
        return Math.max(0, waitMs);
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}
