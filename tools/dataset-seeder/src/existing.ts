import { EntityManager } from 'typeorm';

import { poolSize } from './dataset';
import type { ExistingState, ExistingTournament } from './dataset';
import type { Options } from './options';

export async function readExistingState(manager: EntityManager, options: Options): Promise<ExistingState> {
    const [{ tournaments }] = await manager.query(`SELECT COUNT(*)::int AS "tournaments" FROM "tournament"`);
    const players: Array<{ id: number }> = await manager.query(`SELECT "id" FROM "player" ORDER BY "id" DESC LIMIT $1`, [poolSize(options.profile)]);

    return {
        tournaments: Number(tournaments),
        players: players.map((row) => Number(row.id)),
        target: options.into === null ? null : await readTournament(manager, options.into),
    };
}

async function readTournament(manager: EntityManager, into: number | 'last'): Promise<ExistingTournament> {
    const rows: Array<{ id: number; name: string; status: string }> =
        into === 'last'
            ? await manager.query(`SELECT "id", "name", "status" FROM "tournament" ORDER BY "id" DESC LIMIT 1`)
            : await manager.query(`SELECT "id", "name", "status" FROM "tournament" WHERE "id" = $1`, [into]);

    if (rows.length === 0) {
        throw new Error(into === 'last' ? 'The database holds no tournament to add to.' : `No tournament with id ${into}.`);
    }
    if (rows[0].status !== 'open') {
        throw new Error(`Tournament ${rows[0].id} ("${rows[0].name}") is ${rows[0].status}; only an open tournament can be added to.`);
    }

    const id = Number(rows[0].id);
    const participants: Array<{ playerId: number; participantId: number }> = await manager.query(
        `SELECT "playerId", "id" AS "participantId" FROM "participant" WHERE "tournamentId" = $1 ORDER BY "id"`,
        [id],
    );
    const songs: Array<{ id: number }> = await manager.query(`SELECT "id" FROM "song" WHERE "tournamentId" = $1 ORDER BY "id"`, [id]);
    const [{ running }] = await manager.query(
        `SELECT COUNT(*)::int AS "running" FROM "schedule" WHERE "tournamentId" = $1 AND "status" = 'running'`,
        [id],
    );

    console.log(`Adding to tournament ${id} ("${rows[0].name}"): ${participants.length} people entered, ${songs.length} songs.`);

    return {
        id,
        participants: new Map(participants.map((row) => [Number(row.playerId), Number(row.participantId)])),
        songs: songs.map((row) => Number(row.id)),
        hasRunningSchedule: Number(running) > 0,
    };
}
