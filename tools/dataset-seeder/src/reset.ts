import { EntityManager } from 'typeorm';

const KEPT = ['migrations', 'account'];

const DELETED = ['player'];

export async function resetDatabase(manager: EntityManager): Promise<void> {
    const rows: Array<{ table: string }> = await manager.query(
        `SELECT table_name AS "table"
         FROM   information_schema.tables
         WHERE  table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER  BY table_name`,
    );

    const truncated = rows.map((row) => row.table).filter((table) => !KEPT.includes(table) && !DELETED.includes(table));

    await manager.query(`UPDATE "account" SET "playerId" = NULL`);
    if (truncated.length > 0) {
        await manager.query(`TRUNCATE TABLE ${truncated.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }
    for (const table of DELETED) {
        await manager.query(`DELETE FROM "${table}"`);
        await manager.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), 1, false)`, [table]);
    }
}
