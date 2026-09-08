import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { RedisHealthService } from './redis-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisHealthService) {}
  @Get('live')
  live() { return { status: 'ok', service: 'realtime' }; }

  @Get('ready')
  async ready() {
    try {
      await this.redis.ping();
      return { status: 'ready', service: 'realtime', dependencies: { redis: { status: 'up' } } };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'realtime',
        dependencies: { redis: { status: 'down', detail: error instanceof Error ? error.message : String(error) } },
      });
    }
  }
}
