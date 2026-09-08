import { createMigrationDataSource } from './migration-data-source';
import { seedInitialAdmin } from './seed-initial-admin';
import { seedLocalFixture } from './seed-local-fixture';

async function run(): Promise<void> {
  const dataSource = createMigrationDataSource();
  await dataSource.initialize();
  try {
    const applied = await dataSource.runMigrations({ transaction: 'all' });
    console.log(`Migration runner completed; ${applied.length} migration(s) applied.`);
    await seedInitialAdmin(dataSource);
    await seedLocalFixture(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error('Migration runner failed.', error);
  process.exitCode = 1;
});
