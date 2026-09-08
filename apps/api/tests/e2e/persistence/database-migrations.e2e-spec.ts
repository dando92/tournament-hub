import { DataSource } from 'typeorm';

import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

describe('PostgreSQL migrations (e2e)', () => {
  const database = getTestDatabaseName('migrations');
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await resetMigratedTestDatabase(database);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await dropTestDatabase(database);
  });

  it('creates the complete application schema from an empty database', async () => {
    const tables = await dataSource.query<{ table_name: string }[]>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`,
    );

    expect(tables.map(({ table_name }) => table_name)).toEqual(
      expect.arrayContaining([
        'account',
        'division',
        'entrant',
        'match',
        'match_result',
        'participant',
        'phase',
        'phase_group',
        'player',
        'score',
        'song',
        'tournament',
      ]),
    );
    expect(tables.map(({ table_name }) => table_name)).not.toEqual(
      expect.arrayContaining(['event_outbox', 'event_inbox']),
    );
    await expect(dataSource.showMigrations()).resolves.toBe(false);
  });

  it('is idempotent and matches the current TypeORM entity metadata', async () => {
    await expect(
      dataSource.runMigrations({ transaction: 'all' }),
    ).resolves.toEqual([]);

    const schemaChanges = await dataSource.driver.createSchemaBuilder().log();
    expect(schemaChanges.upQueries).toEqual([]);
  });
});
