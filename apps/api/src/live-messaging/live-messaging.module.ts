import { Module } from '@nestjs/common';
import { LIVE_EVENT_PUBLISHER, RedisLiveEventPublisher } from '@tournament-hub/live-messaging';

@Module({
  providers: [
    RedisLiveEventPublisher,
    { provide: LIVE_EVENT_PUBLISHER, useExisting: RedisLiveEventPublisher },
  ],
  exports: [
    LIVE_EVENT_PUBLISHER,
  ],
})
export class LiveMessagingModule {}
