import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestMetrics = {
    queries: number;
    databaseMs: number;
    rows: number;
};

const storage = new AsyncLocalStorage<RequestMetrics>();

export function newRequestMetrics(): RequestMetrics {
    return { queries: 0, databaseMs: 0, rows: 0 };
}

export function withRequestMetrics<T>(metrics: RequestMetrics, run: () => T): T {
    return storage.run(metrics, run);
}

export function currentRequestMetrics(): RequestMetrics | undefined {
    return storage.getStore();
}
