const { Socket } = require('node:net');
const { Client } = require('pg');

function pingRedis() {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let response = '';

    socket.setTimeout(3000);
    socket.once('error', reject);
    socket.once('timeout', () => reject(new Error('Redis PING timed out')));
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\r\n')) {
        socket.destroy();
        response.startsWith('+PONG')
          ? resolve(response.trim())
          : reject(new Error(`Unexpected Redis response: ${response.trim()}`));
      }
    });
    socket.connect(Number(process.env.REDIS_PORT ?? 6379), process.env.REDIS_HOST ?? '127.0.0.1', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });
  });
}

describe('local platform dependencies', () => {
  let postgres;

  beforeAll(async () => {
    postgres = new Client({
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.DATABASE_USER ?? 'tournament_hub',
      password: process.env.DATABASE_PASSWORD ?? 'tournament_hub',
      database: process.env.DATABASE_NAME ?? 'tournament_hub',
    });
    await postgres.connect();
  });

  afterAll(async () => {
    await postgres?.end();
  });

  it('connects to PostgreSQL and finds the migrated application schema', async () => {
    await expect(postgres.query('SELECT 1 AS value')).resolves.toMatchObject({
      rows: [{ value: 1 }],
    });
    const migrations = await postgres.query('SELECT COUNT(*)::int AS count FROM migrations');
    expect(migrations.rows[0].count).toBeGreaterThanOrEqual(1);
    await expect(postgres.query("SELECT to_regclass('public.tournament') AS table_name")).resolves.toMatchObject({
      rows: [{ table_name: 'tournament' }],
    });
  });

  it('connects to Redis using the production PING protocol', async () => {
    await expect(pingRedis()).resolves.toBe('+PONG');
  });
});
