import pg from 'pg';

const args = process.argv.slice(2);

function flag(name) {
    return args.includes(`--${name}`);
}

function option(name, fallback) {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const client = new pg.Client({
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? 'tournament_hub',
    password: process.env.DATABASE_PASSWORD ?? 'tournament_hub',
    database: process.env.DATABASE_NAME ?? 'tournament_hub',
});

const TOP_STATEMENTS = `
    SELECT      calls,
                ROUND(total_exec_time::numeric, 1)                   AS "totalMs",
                ROUND((total_exec_time / NULLIF(calls, 0))::numeric, 2) AS "meanMs",
                rows,
                LEFT(REGEXP_REPLACE(query, '\\s+', ' ', 'g'), $2)     AS "query"
    FROM        pg_stat_statements s
    JOIN        pg_database d ON d.oid = s.dbid
    WHERE       d.datname = current_database()
        AND     s.query NOT LIKE '%pg_stat_statements%'
    ORDER BY    total_exec_time DESC
    LIMIT       $1
`;

await client.connect();

try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');

    if (flag('reset')) {
        await client.query('SELECT pg_stat_statements_reset()');
        console.log('pg_stat_statements reset.');
    }

    if (flag('reset') && !flag('top')) {
        process.exit(0);
    }

    const limit = Number(option('top', 20));
    const width = Number(option('width', 120));
    const { rows } = await client.query(TOP_STATEMENTS, [limit, width]);
    if (rows.length === 0) {
        console.log('No statements recorded. Reset, run the scenario, then report.');
        process.exit(0);
    }

    const totalMs = rows.reduce((total, row) => total + Number(row.totalMs), 0);
    console.log(`Top ${rows.length} statements by total execution time (${totalMs.toFixed(1)} ms across them):\n`);
    for (const [index, row] of rows.entries()) {
        console.log(`${String(index + 1).padStart(3)}. ${String(row.totalMs).padStart(10)} ms  ${String(row.calls).padStart(7)} calls  ${String(row.meanMs).padStart(8)} ms avg  ${String(row.rows).padStart(9)} rows`);
        console.log(`     ${row.query}`);
    }
} catch (error) {
    console.error(`pg_stat_statements unavailable: ${error.message}`);
    console.error('Recreate the local stack so postgres starts with the preloaded library: npm run local:reset');
    process.exitCode = 1;
} finally {
    await client.end();
}
