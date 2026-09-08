import { DataSource } from 'typeorm';
import { join } from 'node:path';

import { Entities } from '@tournament-hub/persistence';

export function createMigrationDataSource(
  database = process.env.DATABASE_NAME ?? 'tournament_hub',
): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'tournament_hub',
    password: process.env.DATABASE_PASSWORD ?? 'tournament_hub',
    database,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    synchronize: false,
    entities: Entities,
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
    migrationsTableName: 'migrations',
  });
}

export default createMigrationDataSource();
