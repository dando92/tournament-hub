import { HealthService } from '@api/health/health.service';

describe('HealthService', () => {
  const dataSource = { query: jest.fn() };
  const redisHealth = { ping: jest.fn() };
  let service: HealthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new HealthService(dataSource as never, redisHealth as never);
  });

  it('reports ready only when PostgreSQL, Redis, and the migration runner are available', async () => {
    dataSource.query.mockResolvedValue(undefined);
    redisHealth.ping.mockResolvedValue(undefined);

    await expect(service.readiness()).resolves.toEqual({
      status: 'ready',
      dependencies: {
        postgres: { status: 'up' },
        redis: { status: 'up' },
        migrations: { status: 'up' },
      },
    });
  });

  it('distinguishes a PostgreSQL outage and skips the migration query', async () => {
    dataSource.query.mockRejectedValue(new Error('database unavailable'));
    redisHealth.ping.mockResolvedValue(undefined);

    const result = await service.readiness();

    expect(result.status).toBe('not_ready');
    expect(result.dependencies.postgres).toEqual({ status: 'down', detail: 'database unavailable' });
    expect(result.dependencies.redis).toEqual({ status: 'up' });
    expect(result.dependencies.migrations).toEqual({ status: 'down', detail: 'PostgreSQL is unavailable' });
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });

  it('distinguishes a Redis outage', async () => {
    dataSource.query.mockResolvedValue(undefined);
    redisHealth.ping.mockRejectedValue(new Error('redis unavailable'));

    const result = await service.readiness();

    expect(result.status).toBe('not_ready');
    expect(result.dependencies.postgres).toEqual({ status: 'up' });
    expect(result.dependencies.redis).toEqual({ status: 'down', detail: 'redis unavailable' });
    expect(result.dependencies.migrations).toEqual({ status: 'up' });
  });
});
