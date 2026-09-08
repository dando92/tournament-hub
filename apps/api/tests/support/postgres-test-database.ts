import { DataSource, DataSourceOptions } from 'typeorm';

import { createMigrationDataSource } from '../../../migrations/src/migration-data-source';
import { Entities } from '@tournament-hub/persistence';

const databaseHost = process.env.DATABASE_HOST ?? '127.0.0.1';
const databasePort = Number(process.env.DATABASE_PORT ?? 5432);
const databaseUsername = process.env.DATABASE_USER ?? 'tournament_hub';
const databasePassword = process.env.DATABASE_PASSWORD ?? 'tournament_hub';
const databaseSsl =
  process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export function getTestDatabaseName(suite = 'e2e'): string {
  return `tournament_hub_${suite}_test`;
}

export function getTestDataSourceOptions(database: string): DataSourceOptions {
  return {
    type: 'postgres',
    host: databaseHost,
    port: databasePort,
    username: databaseUsername,
    password: databasePassword,
    database,
    ssl: databaseSsl,
    entities: Entities,
    synchronize: false,
  };
}

export async function resetMigratedTestDatabase(
  database: string,
): Promise<DataSource> {
  assertTestDatabaseName(database);
  await dropTestDatabase(database);

  const admin = createAdminDataSource();
  await admin.initialize();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.destroy();
  }

  const migrations = createMigrationDataSource(database);
  await migrations.initialize();
  await migrations.runMigrations({ transaction: 'all' });
  return migrations;
}

export async function dropTestDatabase(database: string): Promise<void> {
  assertTestDatabaseName(database);
  const admin = createAdminDataSource();
  await admin.initialize();
  try {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [database],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
  } finally {
    await admin.destroy();
  }
}

function createAdminDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: databaseHost,
    port: databasePort,
    username: databaseUsername,
    password: databasePassword,
    database: 'postgres',
    ssl: databaseSsl,
  });
}

function assertTestDatabaseName(database: string): void {
  if (!/^tournament_hub_[a-z0-9_]+_test$/.test(database)) {
    throw new Error(`Refusing to manage non-test database: ${database}`);
  }
}
