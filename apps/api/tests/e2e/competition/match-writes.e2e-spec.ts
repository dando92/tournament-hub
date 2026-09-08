import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { Account } from '@tournament-hub/persistence';
import { LIVE_EVENT_PUBLISHER } from '@tournament-hub/live-messaging';
import type { EventEnvelope } from '@tournament-hub/live-messaging';
import { MatchStore } from '@match/match.store';
import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

const database = getTestDatabaseName('match_writes');

process.env.DATABASE_NAME = database;

type MatchBody = {
  id: number;
  name: string;
  scoringSystem: string;
  active: boolean;
  entrants: Array<{ id: number; participants: Array<{ player: { id: number } }> }>;
  rounds: Array<{
    id: number;
    song: { id: number; title: string } | null;
    standings: Array<{ id: number; points: number; player: { id: number }; score: { id: number; percentage: number } | null }>;
  }>;
  tiebreaks: Array<{
    id: number;
    sequence: number;
    invalidated: boolean;
    song: { id: number; title: string } | null;
    standings: Array<{ player: { id: number }; manualPoints: number | null; score: { percentage: number } | null }>;
  }>;
  resultState: {
    status: 'incomplete' | 'tiebreak_required' | 'ready' | 'completed';
    entries: Array<{ playerId: number; points: number; placement: number }>;
    ambiguousTies: Array<{ playerIds: number[]; fromPlacement: number; toPlacement: number }>;
  };
  matchResult: { id: number; playerPoints: Array<{ playerId: number; points: number; placement: number }> } | null;
};

describe('Match writes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  let tournamentId: number;
  let divisionId: number;
  let poolId: number;
  let songId: number;
  let otherSongId: number;
  let firstEntrantId: number;
  let secondEntrantId: number;
  let firstPlayerId: number;
  let secondPlayerId: number;
  const published: EventEnvelope[] = [];

  async function announcedBy(send: () => request.Test): Promise<string[]> {
    published.length = 0;
    await send();

    return published.map((event) => event.type);
  }

  beforeAll(async () => {
    const migrations = await resetMigratedTestDatabase(database);
    await migrations.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LIVE_EVENT_PUBLISHER)
      .useValue({
        publish: (event: EventEnvelope) => {
          published.push(event);

          return Promise.resolve();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    const accountRepository = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
    const credentials = {
      username: 'match-writes-owner',
      email: 'match-writes-owner@example.test',
      password: 'MatchWritesPassword!',
      playerName: 'Match Writes Owner',
    };

    await request(app.getHttpServer()).post('/user').send(credentials).expect(201);
    const account = await accountRepository.findOneByOrFail({ username: credentials.username });
    account.isTournamentCreator = true;
    await accountRepository.save(account);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: credentials.username, password: credentials.password })
      .expect(201);
    accessToken = login.body.access_token;

    const tournament = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Match Writes Tournament' })
      .expect(201);
    tournamentId = tournament.body.id;

    const division = await request(app.getHttpServer())
      .post('/divisions')
      .send({ name: 'Main Division', tournamentId })
      .expect(201);
    divisionId = division.body.id;

    firstEntrantId = await addEntrant('First Player');
    secondEntrantId = await addEntrant('Second Player');

    const phase = await request(app.getHttpServer())
      .post('/phases')
      .send({ name: 'Qualifiers', divisionId })
      .expect(201);

    const pool = await request(app.getHttpServer())
      .post(`/phases/${phase.body.id}/phase-groups`)
      .send({ name: 'Pool A', displayIdentifier: 'A' })
      .expect(201);
    poolId = pool.body.id;

    songId = await addSong('First Song');
    otherSongId = await addSong('Second Song');
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  async function addEntrant(playerName: string): Promise<number> {
    const participant = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/participants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName })
      .expect(201);

    const admitted = await request(app.getHttpServer())
      .post(`/divisions/${divisionId}/participants`)
      .send({ participantIds: [participant.body.id] })
      .expect(201);

    return admitted.body[0].id;
  }

  async function addSong(title: string): Promise<number> {
    const song = await request(app.getHttpServer())
      .post('/songs')
      .send({ title, artist: 'Writer', group: 'Test', difficulty: 9, tournamentId })
      .expect(201);

    return song.body.id;
  }

  async function createMatch(name: string, entrantIds: number[], songIds: number[] = []): Promise<MatchBody> {
    const created = await request(app.getHttpServer())
      .post('/matches')
      .send({
        name,
        subtitle: `${name} subtitle`,
        notes: `${name} notes`,
        phaseGroupId: poolId,
        scoringSystem: 'PlacementPointsWithFailZero',
        entrantIds,
        ...(songIds.length > 0 ? { songIds } : {}),
      })
      .expect(201);

    return await readMatch(created.body.id);
  }

  async function readMatch(id: number): Promise<MatchBody> {
    const response = await request(app.getHttpServer()).get(`/matches/${id}`).expect(200);

    return response.body;
  }

  async function storedState(id: number): Promise<string> {
    const [row] = await dataSource.query<Array<{ state: string }>>('SELECT "state" FROM "match" WHERE "id" = $1', [id]);

    return row.state;
  }

  async function playerIdsOf(match: MatchBody): Promise<[number, number]> {
    return [match.entrants[0].participants[0].player.id, match.entrants[1].participants[0].player.id];
  }

  it('answers a creation with the address of the match it made', async () => {
    const created = await createMatch('Created Match', [firstEntrantId, secondEntrantId], [songId]);

    expect(created).toMatchObject({
      name: 'Created Match',
      subtitle: 'Created Match subtitle',
      notes: 'Created Match notes',
      active: false,
      phaseGroupId: poolId,
      matchResult: null,
      advancementRules: [],
    });
    expect(created.rounds).toHaveLength(1);
    expect(created.rounds[0].song).toMatchObject({ id: songId, title: 'First Song' });
    expect(created.entrants.map((entrant) => entrant.id)).toEqual([firstEntrantId, secondEntrantId]);

    [firstPlayerId, secondPlayerId] = await playerIdsOf(created);
  });

  it('renames a match and replaces its entrants', async () => {
    const created = await createMatch('Editable Match', [firstEntrantId, secondEntrantId]);

    await request(app.getHttpServer())
      .patch(`/matches/${created.id}`)
      .send({ name: 'Renamed Match' })
      .expect(204);
    expect(await readMatch(created.id)).toMatchObject({ name: 'Renamed Match' });

    await request(app.getHttpServer())
      .patch(`/matches/${created.id}`)
      .send({ entrantIds: [secondEntrantId] })
      .expect(204);
    expect((await readMatch(created.id)).entrants.map((entrant) => entrant.id)).toEqual([secondEntrantId]);
  });

  it('refuses to mix songs and hand scoring in the same match', async () => {
    const handScored = await createMatch('Hand Scored Match', [firstEntrantId]);
    await request(app.getHttpServer()).post(`/matches/${handScored.id}/rounds`).send({}).expect(204);

    await request(app.getHttpServer())
      .post(`/matches/${handScored.id}/rounds`)
      .send({ songId })
      .expect(400);

    const played = await createMatch('Played Match', [firstEntrantId], [songId]);
    await request(app.getHttpServer()).post(`/matches/${played.id}/rounds`).send({}).expect(400);
  });

  it('ranks a played round once every player has entered a score', async () => {
    const match = await createMatch('Scored Match', [firstEntrantId, secondEntrantId], [songId]);
    const roundId = match.rounds[0].id;

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
      .send({ percentage: 99, isFailed: false })
      .expect(204);
    const first = await readMatch(match.id);
    expect(first.rounds[0].standings).toHaveLength(1);
    expect(first.rounds[0].standings[0].points).toBe(0);

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
      .send({ percentage: 98, isFailed: false })
      .expect(204);
    const points = (await readMatch(match.id)).rounds[0].standings.map((standing) => standing.points);
    expect(points.filter((value) => value > 0)).not.toHaveLength(0);

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
      .send({ percentage: 50, isFailed: true })
      .expect(204);
    expect((await readMatch(match.id)).rounds[0].standings).toHaveLength(2);

    await request(app.getHttpServer())
      .delete(`/rounds/${roundId}/standings/${firstPlayerId}`)
      .expect(204);
    const removed = await readMatch(match.id);
    expect(removed.rounds[0].standings).toHaveLength(1);
    expect(removed.rounds[0].standings[0].points).toBe(0);
  });

  it('offers only unassigned scores and reports reuse as a conflict', async () => {
    const source = await createMatch('Score Source Match', [firstEntrantId], [songId]);
    const target = await createMatch('Score Target Match', [firstEntrantId], [songId]);
    const playerId = source.entrants[0].participants[0].player.id;

    await request(app.getHttpServer())
      .put(`/rounds/${source.rounds[0].id}/scores/${playerId}`)
      .send({ percentage: 99, isFailed: false })
      .expect(204);

    const scoreId = (await readMatch(source.id)).rounds[0].standings[0].score.id;
    const available = await request(app.getHttpServer())
      .get('/scores')
      .query({ songId, playerId })
      .expect(200);
    expect(available.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: scoreId })]));

    await request(app.getHttpServer())
      .put(`/rounds/${source.rounds[0].id}/scores/${playerId}`)
      .send({ percentage: 99, isFailed: false, scoreId })
      .expect(204);

    const conflict = await request(app.getHttpServer())
      .put(`/rounds/${target.rounds[0].id}/scores/${playerId}`)
      .send({ percentage: 99, isFailed: false, scoreId })
      .expect(409);
    expect(conflict.body).toMatchObject({
      code: 'SCORE_ALREADY_ASSIGNED',
      scoreId,
      roundId: source.rounds[0].id,
    });
  });

  it('persists a scoring-system change and recalculates completed rounds', async () => {
    const match = await createMatch('Scoring Strategy Match', [firstEntrantId, secondEntrantId], [songId]);
    const roundId = match.rounds[0].id;

    await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
        .send({ percentage: 99, isFailed: true })
        .expect(204);
    await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
        .send({ percentage: 98, isFailed: false })
        .expect(204);

    const before = await readMatch(match.id);
    expect(before.rounds[0].standings.find((standing) => standing.player.id === firstPlayerId)?.points).toBe(0);

    await request(app.getHttpServer())
        .patch(`/matches/${match.id}`)
        .send({ scoringSystem: 'PlacementPointsIncludingFails' })
        .expect(204);

    const after = await readMatch(match.id);
    expect(after.scoringSystem).toBe('PlacementPointsIncludingFails');
    expect(after.rounds[0].standings.find((standing) => standing.player.id === firstPlayerId)?.points).toBe(2);
  });

  it('states points on a hand-scored round and refuses the other kind of evidence', async () => {
    const match = await createMatch('Stated Match', [firstEntrantId, secondEntrantId]);
    await request(app.getHttpServer()).post(`/matches/${match.id}/rounds`).send({}).expect(204);
    const roundId = (await readMatch(match.id)).rounds[0].id;

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/points/${firstPlayerId}`)
      .send({ points: 3 })
      .expect(204);
    expect((await readMatch(match.id)).rounds[0].standings[0]).toMatchObject({ points: 3, score: null });

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
      .send({ percentage: 99, isFailed: false })
      .expect(400);

    const played = await createMatch('Played Points Match', [firstEntrantId], [songId]);
    await request(app.getHttpServer())
      .put(`/rounds/${played.rounds[0].id}/points/${firstPlayerId}`)
      .send({ points: 3 })
      .expect(400);
  });

  it('replaces the song of a round it can drop, and refuses one that still holds scores', async () => {
    const match = await createMatch('Song Swap Match', [firstEntrantId], [songId]);
    const roundId = match.rounds[0].id;

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}`)
      .send({ songId: otherSongId })
      .expect(204);
    const swapped = await readMatch(match.id);
    expect(swapped.rounds).toHaveLength(1);
    expect(swapped.rounds[0].song).toMatchObject({ id: otherSongId });
    expect(swapped.rounds[0].id).not.toBe(roundId);

    const scoredRoundId = swapped.rounds[0].id;
    await request(app.getHttpServer())
      .put(`/rounds/${scoredRoundId}/scores/${firstPlayerId}`)
      .send({ percentage: 90, isFailed: false })
      .expect(204);

    await request(app.getHttpServer()).delete(`/rounds/${scoredRoundId}`).expect(400);
    await request(app.getHttpServer()).put(`/rounds/${scoredRoundId}`).send({ songId }).expect(400);
    expect((await readMatch(match.id)).rounds[0].standings).toHaveLength(1);
  });

  it('commits a result, advances its winner, and takes the advancement back when it is reopened', async () => {
    const source = await createMatch('Advancing Source', [firstEntrantId, secondEntrantId]);
    const target = await createMatch('Advancing Target', []);
    await request(app.getHttpServer())
      .put(`/advancement-rules/sources/match/${source.id}`)
      .send({ rules: [{ sourcePlacement: 1, targetKind: 'match', targetId: target.id, targetSlot: 1 }] })
      .expect(204);

    await request(app.getHttpServer()).post(`/matches/${source.id}/rounds`).send({}).expect(204);
    const roundId = (await readMatch(source.id)).rounds[0].id;

    await request(app.getHttpServer()).put(`/matches/${source.id}/result`).expect(400);

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/points/${firstPlayerId}`)
      .send({ points: 3 })
      .expect(204);
    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/points/${secondPlayerId}`)
      .send({ points: 1 })
      .expect(204);

    const committed = await request(app.getHttpServer()).put(`/matches/${source.id}/result`).expect(200);
    expect(committed.body).toEqual({ startggReport: 'skipped' });
    expect((await readMatch(source.id)).matchResult.playerPoints).toEqual([
      { playerId: firstPlayerId, points: 3, placement: 1 },
      { playerId: secondPlayerId, points: 1, placement: 2 },
    ]);
    expect((await readMatch(target.id)).entrants.map((entrant) => entrant.id)).toEqual([firstEntrantId]);

    await request(app.getHttpServer()).patch(`/matches/${source.id}`).send({ entrantIds: [] }).expect(400);
    await request(app.getHttpServer()).put(`/matches/${source.id}/active`).send({ active: true }).expect(400);
    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/points/${firstPlayerId}`)
      .send({ points: 5 })
      .expect(400);

    await request(app.getHttpServer()).delete(`/matches/${source.id}/result`).expect(204);
    expect((await readMatch(source.id)).matchResult).toBeNull();
    expect((await readMatch(target.id)).entrants).toHaveLength(0);
    await expect(dataSource.query('SELECT COUNT(*)::int AS "count" FROM "match_result"')).resolves.toEqual([{ count: 0 }]);
  });

  it('blocks an ambiguous tie, resolves it by hand, and advances the frozen placements', async () => {
    const source = await createMatch('Tied Source', [firstEntrantId, secondEntrantId]);
    const firstTarget = await createMatch('First Tie Target', []);
    const secondTarget = await createMatch('Second Tie Target', []);
    await request(app.getHttpServer())
      .put(`/advancement-rules/sources/match/${source.id}`)
      .send({ rules: [
        { sourcePlacement: 1, targetKind: 'match', targetId: firstTarget.id, targetSlot: 1 },
        { sourcePlacement: 2, targetKind: 'match', targetId: secondTarget.id, targetSlot: 1 },
      ] })
      .expect(204);
    await request(app.getHttpServer()).post(`/matches/${source.id}/rounds`).send({}).expect(204);
    const roundId = (await readMatch(source.id)).rounds[0].id;
    await request(app.getHttpServer()).put(`/rounds/${roundId}/points/${firstPlayerId}`).send({ points: 1 }).expect(204);
    await request(app.getHttpServer()).put(`/rounds/${roundId}/points/${secondPlayerId}`).send({ points: 1 }).expect(204);

    const tied = await readMatch(source.id);
    expect(tied.resultState).toMatchObject({
      status: 'tiebreak_required',
      ambiguousTies: [{ playerIds: [firstPlayerId, secondPlayerId], fromPlacement: 1, toPlacement: 2 }],
    });
    await request(app.getHttpServer()).put(`/matches/${source.id}/result`).expect(400);

    const created = await request(app.getHttpServer())
      .post(`/matches/${source.id}/tiebreaks`)
      .send({ playerIds: [firstPlayerId, secondPlayerId] })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/matches/${source.id}/tiebreaks/${created.body.id}/points/${firstPlayerId}`)
      .send({ points: 2 })
      .expect(204);
    await request(app.getHttpServer())
      .put(`/matches/${source.id}/tiebreaks/${created.body.id}/points/${secondPlayerId}`)
      .send({ points: 3 })
      .expect(204);

    expect((await readMatch(source.id)).resultState.status).toBe('ready');
    await request(app.getHttpServer()).put(`/matches/${source.id}/result`).expect(200);
    expect((await readMatch(source.id)).matchResult.playerPoints).toEqual([
      { playerId: secondPlayerId, points: 1, placement: 1 },
      { playerId: firstPlayerId, points: 1, placement: 2 },
    ]);
    expect((await readMatch(firstTarget.id)).entrants.map((entrant) => entrant.id)).toEqual([secondEntrantId]);
    expect((await readMatch(secondTarget.id)).entrants.map((entrant) => entrant.id)).toEqual([firstEntrantId]);
  });

  it('activates a match and deletes it with the rounds it held', async () => {
    const match = await createMatch('Disposable Match', [firstEntrantId], [songId]);

    await request(app.getHttpServer())
      .put(`/matches/${match.id}/active`)
      .send({ active: true })
      .expect(204);
    expect((await readMatch(match.id)).active).toBe(true);

    await request(app.getHttpServer()).delete(`/matches/${match.id}`).expect(204);

    await request(app.getHttpServer()).get(`/matches/${match.id}`).expect(200).expect(({ body }) => {
      expect(body).toEqual({});
    });
    await expect(
      dataSource.query('SELECT COUNT(*)::int AS "count" FROM "round" WHERE "matchId" = $1', [match.id]),
    ).resolves.toEqual([{ count: 0 }]);
  });

  describe('when the field of a scored match changes', () => {
    it('takes the standings of the player who left, and leaves none behind', async () => {
      const match = await createMatch('Field Removal', [firstEntrantId, secondEntrantId], [songId]);
      const roundId = match.rounds[0].id;

      await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
        .send({ percentage: 95, isFailed: false })
        .expect(204);
      await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
        .send({ percentage: 94, isFailed: false })
        .expect(204);

      await request(app.getHttpServer())
        .patch(`/matches/${match.id}`)
        .send({ entrantIds: [firstEntrantId] })
        .expect(204);

      const after = await readMatch(match.id);
      expect(after.entrants.map((entrant) => entrant.id)).toEqual([firstEntrantId]);
      expect(after.rounds[0].standings.map((standing) => standing.player.id)).toEqual([firstPlayerId]);

      await expect(
        dataSource.query(
          'SELECT COUNT(*)::int AS "count" FROM "standing" WHERE "roundId" = $1',
          [roundId],
        ),
      ).resolves.toEqual([{ count: 1 }]);
    });

    it('sets the points back to zero when somebody joins a round that was complete', async () => {
      const match = await createMatch('Field Addition', [firstEntrantId, secondEntrantId], [songId]);
      const roundId = match.rounds[0].id;

      await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
        .send({ percentage: 95, isFailed: false })
        .expect(204);
      await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
        .send({ percentage: 94, isFailed: false })
        .expect(204);

      const settled = await readMatch(match.id);
      expect(settled.rounds[0].standings.some((standing) => standing.points > 0)).toBe(true);

      const thirdEntrantId = await addEntrant('Third Player');
      await request(app.getHttpServer())
        .patch(`/matches/${match.id}`)
        .send({ entrantIds: [firstEntrantId, secondEntrantId, thirdEntrantId] })
        .expect(204);

      const after = await readMatch(match.id);
      expect(after.rounds[0].standings.every((standing) => standing.points === 0)).toBe(true);
    });
  });

  it('announces the pool only when the pool it draws has moved', async () => {
    const match = await createMatch('Announcing Match', [firstEntrantId, secondEntrantId], [songId]);
    const roundId = match.rounds[0].id;

    const partial = () =>
      request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
        .send({ percentage: 91, isFailed: false })
        .expect(204);

    expect(await announcedBy(partial)).toEqual(['ui.match-changed', 'ui.phase-group-changed']);

    expect(
      await announcedBy(() =>
        request(app.getHttpServer())
          .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
          .send({ percentage: 90, isFailed: false })
          .expect(204),
      ),
    ).toEqual(['ui.match-changed', 'ui.phase-group-changed']);

    expect(await announcedBy(partial)).toEqual(['ui.match-changed']);

    expect(
      await announcedBy(() =>
        request(app.getHttpServer())
          .delete(`/rounds/${roundId}/standings/${firstPlayerId}`)
          .expect(204),
      ),
    ).toEqual(['ui.match-changed', 'ui.phase-group-changed']);
  });

  it('loads the match once to write one score and once to commit a result', async () => {
    const match = await createMatch('Counted Match', [firstEntrantId, secondEntrantId], [songId]);
    const roundId = match.rounds[0].id;

    const countGraphLoadsOf = async (send: () => request.Test): Promise<number> => {
      const logger = dataSource.logger;
      let loads = 0;
      (dataSource as unknown as { logger: unknown }).logger = {
        ...logger,
        logQuery: (query: string) => {
          if (query.includes('"distinctAlias"."Match_id"')) loads += 1;
        },
      };

      try {
        await send();
      } finally {
        (dataSource as unknown as { logger: unknown }).logger = logger;
      }

      return loads;
    };

    expect(
      await countGraphLoadsOf(() =>
        request(app.getHttpServer())
          .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
          .send({ percentage: 95, isFailed: false })
          .expect(204),
      ),
    ).toBe(1);

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
      .send({ percentage: 94, isFailed: false })
      .expect(204);

    expect(
      await countGraphLoadsOf(() => request(app.getHttpServer()).put(`/matches/${match.id}/result`).expect(200)),
    ).toBe(1);
  });

  describe('the stored state of a match', () => {
    it('follows the match from open to completed and back as it is scored', async () => {
      const match = await createMatch('Stateful Match', [firstEntrantId, secondEntrantId], [songId]);
      const roundId = match.rounds[0].id;
      expect(await storedState(match.id)).toBe('open');

      await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
        .send({ percentage: 99, isFailed: false })
        .expect(204);
      expect(await storedState(match.id)).toBe('partial');

      await request(app.getHttpServer())
        .put(`/rounds/${roundId}/scores/${secondPlayerId}`)
        .send({ percentage: 98, isFailed: false })
        .expect(204);
      expect(await storedState(match.id)).toBe('ready');

      await request(app.getHttpServer()).put(`/matches/${match.id}/result`).expect(200);
      expect(await storedState(match.id)).toBe('completed');

      await request(app.getHttpServer()).delete(`/matches/${match.id}/result`).expect(204);
      expect(await storedState(match.id)).toBe('ready');
    });

    it('is rewritten when a rule leaving the match makes its tie ambiguous', async () => {
      const source = await createMatch('Ambiguity Source', [firstEntrantId, secondEntrantId]);
      const target = await createMatch('Ambiguity Target', []);
      await request(app.getHttpServer()).post(`/matches/${source.id}/rounds`).send({}).expect(204);
      const roundId = (await readMatch(source.id)).rounds[0].id;
      await request(app.getHttpServer()).put(`/rounds/${roundId}/points/${firstPlayerId}`).send({ points: 1 }).expect(204);
      await request(app.getHttpServer()).put(`/rounds/${roundId}/points/${secondPlayerId}`).send({ points: 1 }).expect(204);

      expect(await storedState(source.id)).toBe('ready');

      await request(app.getHttpServer())
        .put(`/advancement-rules/sources/match/${source.id}`)
        .send({ rules: [{ sourcePlacement: 1, targetKind: 'match', targetId: target.id, targetSlot: 1 }] })
        .expect(204);
      expect(await storedState(source.id)).toBe('tiebreak_required');

      await request(app.getHttpServer())
        .put(`/advancement-rules/sources/match/${source.id}`)
        .send({ rules: [] })
        .expect(204);
      expect(await storedState(source.id)).toBe('ready');
    });

    it('agrees with the aggregate for every match the suite wrote', async () => {
      const matches = app.get(MatchStore);
      const stored = await dataSource.query<Array<{ id: number; state: string }>>('SELECT "id", "state" FROM "match" ORDER BY "id"');
      expect(stored.length).toBeGreaterThan(0);

      const recomputed = await Promise.all(
        stored.map(async ({ id }) => ({ id, state: (await matches.loadOrFail(id)).state })),
      );
      expect(recomputed).toEqual(stored);
    });
  });
});
