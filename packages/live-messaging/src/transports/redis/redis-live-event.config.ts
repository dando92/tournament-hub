import type { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_LIVE_EVENT_CHANNEL = 'tournament-hub.live';

export interface RedisEndpoint {
  host: string;
  port: number;
}

export function resolveRedisEndpoint(config: ConfigService): RedisEndpoint {
  const url = redisUrl(config);
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : DEFAULT_REDIS_PORT,
    };
  }
  return {
    host: config.get<string>('REDIS_HOST') ?? DEFAULT_REDIS_HOST,
    port: Number(config.get<string>('REDIS_PORT') ?? DEFAULT_REDIS_PORT),
  };
}

export function createRedisClient(config: ConfigService): RedisClientType {
  const url = redisUrl(config);
  if (url) return createClient({ url });

  const { host, port } = resolveRedisEndpoint(config);
  return createClient({ socket: { host, port } });
}

export function getLiveEventChannel(config: ConfigService): string {
  return (
    config.get<string>('LIVE_EVENT_CHANNEL') ?? DEFAULT_LIVE_EVENT_CHANNEL
  );
}

function redisUrl(config: ConfigService): string | undefined {
  return config.get<string>('REDIS_URL')?.trim() || undefined;
}
