import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EventEnvelope } from '../../event-envelope';
import type { LiveEventPublisher } from '../../ports/live-event-publisher.interface';
import type { RedisClientType } from 'redis';
import {
  createRedisClient,
  getLiveEventChannel,
} from './redis-live-event.config';

@Injectable()
export class RedisLiveEventPublisher
  implements LiveEventPublisher, OnModuleDestroy
{
  private readonly client: RedisClientType;
  private readonly channel: string;

  constructor(config: ConfigService) {
    this.client = createRedisClient(config);
    this.channel = getLiveEventChannel(config);
  }

  async publish(event: EventEnvelope): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }

    await this.client.publish(this.channel, JSON.stringify(event));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
