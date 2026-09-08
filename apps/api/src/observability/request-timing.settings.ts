export function requestTimingEnabled(): boolean {
    return process.env.REQUEST_TIMING_ENABLED === 'true';
}
