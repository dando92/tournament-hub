import { DataSource, EntityManager } from 'typeorm';
import { Entities } from '@tournament-hub/persistence';

import { DatasetBuilder, ID_TABLES, TABLES } from './dataset';
import { readExistingState } from './existing';
import { parseOptions } from './options';
import { Random } from './random';
import { resetDatabase } from './reset';
import { verifyDataset } from './verify';
import { BulkWriter } from './writer';

async function main(): Promise<void> {
    const options = parseOptions(process.argv.slice(2));
    if (!options) {
        return;
    }

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST ?? '127.0.0.1',
        port: Number(process.env.DATABASE_PORT ?? 5432),
        username: process.env.DATABASE_USER ?? 'tournament_hub',
        password: process.env.DATABASE_PASSWORD ?? 'tournament_hub',
        database: process.env.DATABASE_NAME ?? 'tournament_hub',
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
        entities: Entities,
        extra: { statement_timeout: 0, application_name: 'tournament-hub-dataset-seeder' },
    });

    await dataSource.initialize();
    const startedAt = Date.now();

    try {
        await dataSource.transaction(async (manager) => {
            if (options.reset) {
                console.log('Emptying every data table. Accounts and applied migrations are kept.');
                await resetDatabase(manager);
            }

            const existing = await readExistingState(manager, options);
            const ids = await idCounters(manager);
            const seed = options.seed + existing.tournaments;
            const dataset = new DatasetBuilder(options.profile, new Random(seed), options.tournamentName, ids.allocators, existing).build();

            for (const { table, columns } of TABLES) {
                await new BulkWriter(manager).insert(table, columns, dataset.rows[table]);
            }
            for (const { scheduleId, entryId } of dataset.currentEntries) {
                await manager.query(`UPDATE "schedule" SET "currentEntryId" = $1 WHERE "id" = $2`, [entryId, scheduleId]);
            }
            await ids.advanceSequences(manager);

            report(options.profile.name, seed, dataset.counts);
        });

        console.log('\nAnalysing tables so the planner measures the right plans...');
        await dataSource.query('ANALYZE');

        await ensureStatementStatistics(dataSource);

        const verification = await verifyDataset(dataSource.manager);
        console.log('\nMatches by state:');
        for (const { state, count } of verification.states) {
            console.log(`  ${state.padEnd(20)} ${String(count).padStart(8)}`);
        }

        if (verification.failures.length > 0) {
            console.error('\nThe dataset contradicts the rules it was built from:');
            for (const { invariant, offending } of verification.failures) {
                console.error(`  ${invariant}: ${offending} rows`);
            }
            process.exitCode = 1;

            return;
        }

        console.log(`\nDataset written and verified in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`);
    } finally {
        await dataSource.destroy();
    }
}

async function idCounters(manager: EntityManager): Promise<{
    allocators: Record<string, () => number>;
    advanceSequences: (manager: EntityManager) => Promise<void>;
}> {
    const next: Record<string, number> = {};
    const allocators: Record<string, () => number> = {};

    for (const table of ID_TABLES) {
        const [row] = await manager.query(`SELECT COALESCE(MAX("id"), 0) AS "max" FROM "${table}"`);
        next[table] = Number(row.max) + 1;
        allocators[table] = () => next[table]++;
    }

    return {
        allocators,
        advanceSequences: async (transactional: EntityManager) => {
            for (const table of ID_TABLES) {
                await transactional.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), $2, true)`, [table, next[table] - 1 || 1]);
            }
        },
    };
}

async function ensureStatementStatistics(dataSource: DataSource): Promise<void> {
    try {
        await dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
    } catch (error) {
        console.warn(`\npg_stat_statements is unavailable (${(error as Error).message.split('\n')[0]}).`);
        console.warn('Recreate the local stack to start postgres with the preloaded library: npm run local:reset');
    }
}

function report(profile: string, seed: number, counts: Record<string, number>): void {
    console.log(`\nProfile "${profile}", seed ${seed}, rows written by this run:`);
    for (const { table } of TABLES) {
        if (counts[table] > 0) {
            console.log(`  ${table.padEnd(34)} ${String(counts[table]).padStart(9)}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
