import { Module } from '@nestjs/common';

import { QueryMetricsSubscriber } from './query-metrics.subscriber';

@Module({
    providers: [QueryMetricsSubscriber],
})
export class ObservabilityModule {}
