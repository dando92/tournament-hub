import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { PlayPlanDto } from '@tournament/control-room/play-plan.contract';
import { PlayPlanQueries } from '@tournament/control-room/play-plan.queries';
import { PlanVersionStore } from '@tournament/shared/plan-version.store';

export type PlayPlanRead =
    | { changed: true; etag: string; plan: PlayPlanDto }
    | { changed: false; etag: string };

type CachedPlan = { version: number; etag: string; plan: PlayPlanDto };

@Injectable()
export class PlayPlanService {
    private readonly cache = new Map<number, CachedPlan>();

    constructor(
        private readonly planVersions: PlanVersionStore,
        private readonly lanes: PlayPlanQueries,
    ) {}

    async read(tournamentId: number, ifNoneMatch?: string): Promise<PlayPlanRead> {
        const cached = await this.current(tournamentId);
        if (ifNoneMatch && matches(ifNoneMatch, cached.etag)) {
            return { changed: false, etag: cached.etag };
        }

        return { changed: true, etag: cached.etag, plan: cached.plan };
    }

    async stamp(tournamentId: number): Promise<{ version: string; etag: string }> {
        const current = await this.current(tournamentId);

        return { version: current.plan.version, etag: current.etag };
    }

    private async current(tournamentId: number): Promise<CachedPlan> {
        const version = await this.planVersions.versionOf(tournamentId);
        const cached = this.cache.get(tournamentId);
        if (cached?.version === version) {
            return cached;
        }

        const plan: PlayPlanDto = { version: String(version), lanes: await this.lanes.lanesOf(tournamentId) };
        const built = { version, etag: `"${hashOf(plan.lanes)}"`, plan };
        this.cache.set(tournamentId, built);

        return built;
    }
}

function hashOf(lanes: PlayPlanDto['lanes']): string {
    return createHash('sha256').update(JSON.stringify(lanes)).digest('hex').slice(0, 32);
}

function matches(ifNoneMatch: string, etag: string): boolean {
    return ifNoneMatch
        .split(',')
        .map((candidate) => candidate.trim().replace(/^W\//, ''))
        .includes(etag);
}
