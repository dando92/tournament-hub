import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { Account } from '@tournament-hub/persistence';
import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

const database = getTestDatabaseName('match_reads');

process.env.DATABASE_NAME = database;

describe('Match reads (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  let divisionId: number;
  let poolId: number;
  let otherPoolId: number;
  let playedMatchId: number;
  let advancingMatchId: number;
  let otherPoolMatchId: number;
  let songId: number;
  let firstEntrantId: number;
  let secondEntrantId: number;

  beforeAll(async () => {
    const migrations = await resetMigratedTestDatabase(database);
    await migrations.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    const accountRepository = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
    const credentials = {
      username: 'match-reads-owner',
      email: 'match-reads-owner@example.test',
      password: 'MatchReadsPassword!',
      playerName: 'Match Reads Owner',
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
      .send({ name: 'Match Reads Tournament' })
      .expect(201);
    const tournamentId = tournament.body.id;

    const division = await request(app.getHttpServer())
      .post('/divisions')
      .send({ name: 'Main Division', tournamentId })
      .expect(201);
    divisionId = division.body.id;

    firstEntrantId = await addEntrant(tournamentId, 'First Player');
    secondEntrantId = await addEntrant(tournamentId, 'Second Player');

    const phase = await request(app.getHttpServer())
      .post('/phases')
      .send({ name: 'Qualifiers', divisionId })
      .expect(201);

    poolId = await addPool(phase.body.id, 'Pool A', 'A');
    otherPoolId = await addPool(phase.body.id, 'Pool B', 'B');

    const song = await request(app.getHttpServer())
      .post('/songs')
      .send({ title: 'Read Model', artist: 'Projection', group: 'Test', difficulty: 9, tournamentId })
      .expect(201);
    songId = song.body.id;

    playedMatchId = await addMatch(poolId, 'Qualifier 1', [firstEntrantId, secondEntrantId], [songId]);
    advancingMatchId = await addMatch(poolId, 'Qualifier 2', [firstEntrantId], []);
    otherPoolMatchId = await addMatch(otherPoolId, 'Qualifier 3', [secondEntrantId], []);

    await request(app.getHttpServer())
      .put(`/advancement-rules/sources/match/${playedMatchId}`)
      .send({ rules: [{ sourcePlacement: 1, targetKind: 'match', targetId: advancingMatchId, targetSlot: 1 }] })
      .expect(204);
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  async function addEntrant(tournamentId: number, playerName: string): Promise<number> {
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

  async function addPool(phaseId: number, name: string, displayIdentifier: string): Promise<number> {
    const pool = await request(app.getHttpServer())
      .post(`/phases/${phaseId}/phase-groups`)
      .send({ name, displayIdentifier })
      .expect(201);

    return pool.body.id;
  }

  async function addMatch(phaseGroupId: number, name: string, entrantIds: number[], songIds: number[]): Promise<number> {
    const match = await request(app.getHttpServer())
      .post('/matches')
      .send({
        name,
        subtitle: `${name} subtitle`,
        notes: `${name} notes`,
        phaseGroupId,
        scoringSystem: 'PlacementPointsWithFailZero',
        entrantIds,
        ...(songIds.length > 0 ? { songIds } : {}),
      })
      .expect(201);

    return match.body.id;
  }

  async function readMatch(id: number): Promise<any> {
    const response = await request(app.getHttpServer()).get(`/matches/${id}`).expect(200);
    return response.body;
  }

  it('projects one match with its entrants, rounds, scores and rules', async () => {
    const before = await readMatch(playedMatchId);
    const roundId = before.rounds[0].id;
    const firstPlayerId = before.entrants[0].participants[0].player.id;

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/scores/${firstPlayerId}`)
      .send({ percentage: 92.5, isFailed: false })
      .expect(204);

    const match = await readMatch(playedMatchId);

    expect(match).toEqual({
      id: playedMatchId,
      name: 'Qualifier 1',
      subtitle: 'Qualifier 1 subtitle',
      notes: 'Qualifier 1 notes',
      scoringSystem: 'PlacementPointsWithFailZero',
      active: false,
      state: 'partial',
      phaseGroupId: poolId,
      matchResult: null,
      resultState: { status: 'incomplete', entries: [], ambiguousTies: [] },
      tiebreaks: [],
      entrants: [
        {
          id: firstEntrantId,
          name: 'First Player',
          type: 'player',
          status: 'active',
          participants: [
            {
              id: expect.any(Number),
              roles: expect.arrayContaining(['competitor']),
              status: 'registered',
              player: { id: firstPlayerId, playerName: 'First Player' },
            },
          ],
        },
        {
          id: secondEntrantId,
          name: 'Second Player',
          type: 'player',
          status: 'active',
          participants: [
            {
              id: expect.any(Number),
              roles: expect.arrayContaining(['competitor']),
              status: 'registered',
              player: { id: expect.any(Number), playerName: 'Second Player' },
            },
          ],
        },
      ],
      rounds: [
        {
          id: roundId,
          song: { id: songId, title: 'Read Model' },
          standings: [
            {
              id: expect.any(Number),
              points: expect.any(Number),
              player: { id: firstPlayerId, playerName: 'First Player' },
              score: { id: expect.any(Number), percentage: 92.5, isFailed: false },
            },
          ],
        },
      ],
      advancementRules: [
        {
          id: expect.any(Number),
          sourceKind: 'match',
          sourceId: playedMatchId,
          sourceName: 'Qualifier 1',
          sourcePlacement: 1,
          targetKind: 'match',
          targetId: advancingMatchId,
          targetName: 'Qualifier 2',
          targetSlot: 1,
        },
      ],
    });
  });

  it('carries the rule that reaches a match as well as the one that leaves it', async () => {
    const match = await readMatch(advancingMatchId);

    expect(match.rounds).toEqual([]);
    expect(match.advancementRules).toEqual([
      {
        id: expect.any(Number),
        sourceKind: 'match',
        sourceId: playedMatchId,
        sourceName: 'Qualifier 1',
        sourcePlacement: 1,
        targetKind: 'match',
        targetId: advancingMatchId,
        targetName: 'Qualifier 2',
        targetSlot: 1,
      },
    ]);
  });

  it('projects a hand-scored round, which has points and no song', async () => {
    await request(app.getHttpServer())
      .post(`/matches/${otherPoolMatchId}/rounds`)
      .send({})
      .expect(204);

    const withRound = await readMatch(otherPoolMatchId);
    const roundId = withRound.rounds[0].id;
    const playerId = withRound.entrants[0].participants[0].player.id;

    await request(app.getHttpServer())
      .put(`/rounds/${roundId}/points/${playerId}`)
      .send({ points: 3 })
      .expect(204);

    const match = await readMatch(otherPoolMatchId);

    expect(match.rounds).toEqual([
      {
        id: roundId,
        song: null,
        standings: [
          {
            id: expect.any(Number),
            points: 3,
            player: { id: playerId, playerName: 'Second Player' },
            score: null,
          },
        ],
      },
    ]);
  });

  it('reads a pool and a division at their own scopes', async () => {
    await request(app.getHttpServer())
      .get(`/matches/phase-group/${poolId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((match: { id: number }) => match.id)).toEqual([playedMatchId, advancingMatchId]);
        expect(body.every((match: { phaseGroupId: number }) => match.phaseGroupId === poolId)).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/matches/division/${divisionId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((match: { id: number }) => match.id)).toEqual([
          playedMatchId,
          advancingMatchId,
          otherPoolMatchId,
        ]);
        expect(body.map((match: { phaseGroupId: number }) => match.phaseGroupId)).toEqual([
          poolId,
          poolId,
          otherPoolId,
        ]);
      });
  });

  it('reads a pool in two queries whatever the pool holds', async () => {
    const countQueriesOf = async (path: string): Promise<number> => {
      const logger = dataSource.logger;
      let queries = 0;
      (dataSource as unknown as { logger: unknown }).logger = {
        ...logger,
        logQuery: () => {
          queries += 1;
        },
      };

      try {
        await request(app.getHttpServer()).get(path).expect(200);
      } finally {
        (dataSource as unknown as { logger: unknown }).logger = logger;
      }

      return queries;
    };

    expect(await countQueriesOf(`/matches/phase-group/${poolId}`)).toBe(2);
    expect(await countQueriesOf(`/matches/phase-group/${otherPoolId}`)).toBe(2);
    expect(await countQueriesOf(`/matches/division/${divisionId}`)).toBe(2);
  });

  it('answers an unknown match with no content', async () => {
    await request(app.getHttpServer())
      .get(`/matches/${playedMatchId + 10_000}`)
      .expect(200)
      .expect(({ text }) => expect(text).toBe(''));
  });
});
