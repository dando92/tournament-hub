import { EntityManager } from 'typeorm';

const MAX_PARAMETERS = 30000;

export class BulkWriter {
    constructor(private readonly manager: EntityManager) {}

    async reserveIds(table: string, count: number): Promise<number[]> {
        if (count === 0) {
            return [];
        }

        const rows: Array<{ id: string }> = await this.manager.query(
            `SELECT nextval(pg_get_serial_sequence($1, 'id')) AS id FROM generate_series(1, $2)`,
            [table, count],
        );

        return rows.map((row) => Number(row.id));
    }

    async insert(table: string, columns: string[], rows: unknown[][]): Promise<void> {
        if (rows.length === 0) {
            return;
        }

        const columnList = columns.map((column) => `"${column}"`).join(', ');
        const chunkSize = Math.max(1, Math.floor(MAX_PARAMETERS / columns.length));

        for (let start = 0; start < rows.length; start += chunkSize) {
            const chunk = rows.slice(start, start + chunkSize);
            const parameters: unknown[] = [];
            const tuples = chunk.map((row) => {
                const placeholders = row.map((value) => {
                    parameters.push(value);

                    return `$${parameters.length}`;
                });

                return `(${placeholders.join(', ')})`;
            });

            await this.manager.query(`INSERT INTO "${table}" (${columnList}) VALUES ${tuples.join(', ')}`, parameters);
        }
    }
}
