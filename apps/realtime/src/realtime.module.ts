import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LIVE_EVENT_SUBSCRIBER, RedisLiveEventSubscriber } from '@tournament-hub/live-messaging';
import {
  BROWSER_EVENT_BROADCASTER,
} from './browser/browser-event-broadcaster';
import {
  BROWSER_WEBSOCKET_SERVER_FACTORY,
  WebSocketBrowserEventBroadcaster,
} from './browser/websocket-browser-event.broadcaster';
import { HealthController } from './health.controller';
import { RealtimeEventService } from './live-events/realtime-event.service';
import { RedisHealthService } from './redis-health.service';
import { REALTIME_SNAPSHOT_READER } from './snapshots/realtime-snapshot-reader';
import { TournamentRealtimeRegistry } from './state/tournament-realtime-registry';
import { WebSocketServer } from 'ws';

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'], isGlobal: true })],
  controllers: [HealthController],
  providers: [
    RedisLiveEventSubscriber,
    { provide: LIVE_EVENT_SUBSCRIBER, useExisting: RedisLiveEventSubscriber },
    TournamentRealtimeRegistry,
    { provide: REALTIME_SNAPSHOT_READER, useExisting: TournamentRealtimeRegistry },
    {
      provide: BROWSER_WEBSOCKET_SERVER_FACTORY,
      useValue: () => new WebSocketServer({ noServer: true }),
    },
    WebSocketBrowserEventBroadcaster,
    { provide: BROWSER_EVENT_BROADCASTER, useExisting: WebSocketBrowserEventBroadcaster },
    RealtimeEventService,
    RedisHealthService,
  ],
})
export class RealtimeModule {}
