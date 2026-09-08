import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisHealthService } from './redis-health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, RedisHealthService],
})
export class HealthModule {}
