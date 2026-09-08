import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisHealthService } from './redis-health.service';

export interface DependencyHealth {
  status: 'up' | 'down';
  detail?: string;
}

export interface ReadinessResult {
  status: 'ready' | 'not_ready';
  dependencies: {
    postgres: DependencyHealth;
    redis: DependencyHealth;
    migrations: DependencyHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisHealth: RedisHealthService,
  ) {}

  async readiness(): Promise<ReadinessResult> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);
    const migrations = postgres.status === 'up'
      ? await this.checkMigrationRunner()
      : { status: 'down' as const, detail: 'PostgreSQL is unavailable' };

    return {
      status: postgres.status === 'up' && redis.status === 'up' && migrations.status === 'up'
        ? 'ready'
        : 'not_ready',
      dependencies: { postgres, redis, migrations },
    };
  }

  private async checkPostgres(): Promise<DependencyHealth> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', detail: this.errorMessage(error) };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    try {
      await this.redisHealth.ping();
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', detail: this.errorMessage(error) };
    }
  }

  private async checkMigrationRunner(): Promise<DependencyHealth> {
    try {
      await this.dataSource.query('SELECT 1 FROM migrations LIMIT 1');
      return { status: 'up' };
    } catch (error) {
      const message = this.errorMessage(error);
      if (message.includes('does not exist')) {
        return { status: 'down', detail: 'Migration runner has not completed' };
      }
      return { status: 'down', detail: message };
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown dependency error';
  }
}
