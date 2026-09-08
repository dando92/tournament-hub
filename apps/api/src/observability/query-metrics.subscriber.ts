import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import type { AfterQueryEvent } from 'typeorm';

import { currentRequestMetrics } from './request-metrics.store';
import { requestTimingEnabled } from './request-timing.settings';

@Injectable()
@EventSubscriber()
export class QueryMetricsSubscriber implements EntitySubscriberInterface {
    constructor(dataSource: DataSource) {
        if (!requestTimingEnabled()) {
            return;
        }
        dataSource.subscribers.push(this);
    }

    afterQuery(event: AfterQueryEvent<unknown>): void {
        const metrics = currentRequestMetrics();
        if (!metrics) {
            return;
        }

        metrics.queries += 1;
        metrics.databaseMs += event.executionTime ?? 0;
        metrics.rows += rowsOf(event.rawResults);
    }
}

function rowsOf(rawResults: unknown): number {
    if (Array.isArray(rawResults)) {
        return rawResults.length;
    }
    if (rawResults && typeof rawResults === 'object' && Array.isArray((rawResults as { rows?: unknown[] }).rows)) {
        return (rawResults as { rows: unknown[] }).rows.length;
    }

    return 0;
}
