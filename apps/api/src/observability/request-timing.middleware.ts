import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { newRequestMetrics, withRequestMetrics } from './request-metrics.store';

export function requestTimingHandler(): RequestHandler {
    return (request: Request, response: Response, next: NextFunction) => {
        const metrics = newRequestMetrics();
        const startedAt = process.hrtime.bigint();

        response.on('finish', () => {
            const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            process.stdout.write(
                `${JSON.stringify({
                    metric: 'request',
                    method: request.method,
                    route: routeOf(request),
                    status: response.statusCode,
                    ms: Number(elapsedMs.toFixed(1)),
                    queries: metrics.queries,
                    databaseMs: Number(metrics.databaseMs.toFixed(1)),
                    rows: metrics.rows,
                })}\n`,
            );
        });

        withRequestMetrics(metrics, () => next());
    };
}

function routeOf(request: Request): string {
    return `${request.baseUrl ?? ''}${request.route?.path ?? request.path}`;
}
