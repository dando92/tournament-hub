import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PersistenceModule } from '@tournament-hub/persistence';
import { StartggClient } from '@tournament-hub/startgg';

@Module({
    imports: [
        ConfigModule,
        PersistenceModule,
    ],
    providers: [{
        provide: StartggClient,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => new StartggClient({
            endpoint: config.get<string>('STARTGG_API_URL'),
            perPage: Number(config.get<string>('STARTGG_PER_PAGE') ?? 64),
            minIntervalMs: Number(config.get<string>('STARTGG_MIN_INTERVAL_MS') ?? 1000),
        }),
    }],
    exports: [StartggClient],
})
export class StartggModule {}
