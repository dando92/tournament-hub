import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisClientType } from 'redis';
import { isEventEnvelope } from '../../is-event-envelope';
import type {
  LiveEventHandler,
  LiveEventSubscriber,
} from '../../ports/live-event-subscriber.interface';
import {
  createRedisClient,
  getLiveEventChannel,
} from './redis-live-event.config';

@Injectable()
export class RedisLiveEventSubscriber
  implements LiveEventSubscriber, OnModuleDestroy
{
  private readonly client: RedisClientType;
  private readonly channel: string;

  constructor(config: ConfigService) {
    this.client = createRedisClient(config);
    this.channel = getLiveEventChannel(config);
  }

  async subscribe(handler: LiveEventHandler): Promise<() => Promise<void>> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }

    await this.client.subscribe(this.channel, async (message) => {
      const event = this.parseEvent(message);
      if (event) {
        await handler(event);
      }
    });

    return async () => {
      if (this.client.isOpen) {
        await this.client.unsubscribe(this.channel);
      }
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private parseEvent(message: string) {
    try {
      const value: unknown = JSON.parse(message);
      return isEventEnvelope(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }
}
