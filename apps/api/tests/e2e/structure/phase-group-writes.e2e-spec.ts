import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { Account } from '@tournament-hub/persistence';
import { LIVE_EVENT_PUBLISHER } from '@tournament-hub/live-messaging';
import type { EventEnvelope } from '@tournament-hub/live-messaging';
import { PhaseGroupQueries } from '../../../src/tournament/structure/phase-group/phase-group.queries';
import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

const database = getTestDatabaseName('phase_group_writes');

process.env.DATABASE_NAME = database;

describe('Phase group writes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let phaseGroupQueries: PhaseGroupQueries;
  let accessToken: string;

  let tournamentId: number;
  let divisionId: number;
  let phaseId: number;
  let defaultPoolId: number;
  const entrantIdByName = new Map<string, number>();
  const published: EventEnvelope[] = [];

  async function announcedBy(send: () => request.Test): Promise<EventEnvelope[]> {
    published.length = 0;
    await send();

    return [...published];
  }

  function seats(phaseGroupId: number) {
    return phaseGroupQueries.entrants(phaseGroupId);
  }

  async function createMatch(phaseGroupId: number, entrantIds: number[]): Promise<number> {
    const match = await request(app.getHttpServer())
      .post('/matches')
      .send({ name: 'Set 1', phaseGroupId, scoringSystem: 'PlacementPointsWithFailZero', entrantIds })
      .expect(201);

    return match.body.id;
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
    phaseGroupQueries = moduleFixture.get(PhaseGroupQueries);
    const accountRepository = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
    const credentials = {
      username: 'phase-group-writes-owner',
      email: 'phase-group-writes-owner@example.test',
      password: 'PhaseGroupWritesPassword!',
      playerName: 'Phase Group Writes Owner',
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
      .send({ name: 'Phase Group Writes Tournament' })
      .expect(201);
    tournamentId = tournament.body.id;

    const division = await request(app.getHttpServer())
      .post('/divisions')
      .send({ name: 'Main Division', tournamentId })
      .expect(201);
    divisionId = division.body.id;

    for (const playerName of ['Ann', 'Bob']) {
      const participant = await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/participants`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ playerName })
        .expect(201);
      const admitted = await request(app.getHttpServer())
        .post(`/divisions/${divisionId}/participants`)
        .send({ participantIds: [participant.body.id] })
        .expect(201);
      entrantIdByName.set(playerName, admitted.body[0].id);
    }

    const phase = await request(app.getHttpServer())
      .post('/phases')
      .send({ name: 'Qualifiers', divisionId })
      .expect(201);
    phaseId = phase.body.id;

    const pools = await request(app.getHttpServer()).get(`/divisions/${divisionId}/summary`).expect(200);
    defaultPoolId = pools.body.phases[0].phaseGroups[0].id;
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  it('announces the phase and the pool when one is created, and answers with its id', async () => {
    const events = await announcedBy(() =>
      request(app.getHttpServer()).post(`/phases/${phaseId}/phase-groups`).send({}).expect(201),
    );

    expect(events.map((event) => event.type)).toEqual(['ui.phase-changed', 'ui.phase-group-changed']);
    expect(events[0].payload).toEqual({ tournamentId, divisionId, phaseId });
    expect(events[1].payload).toEqual({ tournamentId, divisionId, phaseId, phaseGroupId: expect.any(Number) });
  });

  it('numbers a new pool after the ones its phase already holds', async () => {
    const created = await request(app.getHttpServer()).post(`/phases/${phaseId}/phase-groups`).send({}).expect(201);

    const summary = await request(app.getHttpServer()).get(`/divisions/${divisionId}/summary`).expect(200);
    const pool = summary.body.phases
      .flatMap((phase: { phaseGroups: Array<{ id: number; displayIdentifier: string }> }) => phase.phaseGroups)
      .find((candidate: { id: number }) => candidate.id === created.body.id);

    expect(pool.displayIdentifier).toBe('Pool 3');
    expect(pool.name).toBe('Pool 3');
  });

  it('announces the phase and the pool when one is renamed', async () => {
    const events = await announcedBy(() =>
      request(app.getHttpServer()).patch(`/phase-groups/${defaultPoolId}`).send({ name: 'Pool A' }).expect(204),
    );

    expect(events.map((event) => event.type)).toEqual(['ui.phase-changed', 'ui.phase-group-changed']);
    expect(events[1].payload).toEqual({ tournamentId, divisionId, phaseId, phaseGroupId: defaultPoolId });
  });

  it('announces the phase when a pool is deleted, and refuses a second delete of the same one', async () => {
    const created = await request(app.getHttpServer()).post(`/phases/${phaseId}/phase-groups`).send({}).expect(201);

    const events = await announcedBy(() =>
      request(app.getHttpServer()).delete(`/phase-groups/${created.body.id}`).expect(204),
    );
    expect(events.map((event) => event.type)).toEqual(['ui.phase-changed']);

    const again = await announcedBy(() =>
      request(app.getHttpServer()).delete(`/phase-groups/${created.body.id}`).expect(404),
    );
    expect(again).toEqual([]);
  });

  it('refuses to leave a phase without a pool', async () => {
    const lonely = await request(app.getHttpServer())
      .post('/phases')
      .send({ name: 'Top Cut', divisionId })
      .expect(201);

    const summary = await request(app.getHttpServer()).get(`/divisions/${divisionId}/summary`).expect(200);
    const phase = summary.body.phases.find((candidate: { id: number }) => candidate.id === lonely.body.id);
    expect(phase.phaseGroups).toHaveLength(1);

    await request(app.getHttpServer()).delete(`/phase-groups/${phase.phaseGroups[0].id}`).expect(400);

    const after = await request(app.getHttpServer()).get(`/divisions/${divisionId}/summary`).expect(200);
    expect(
      after.body.phases.find((candidate: { id: number }) => candidate.id === lonely.body.id).phaseGroups,
    ).toHaveLength(1);
  });

  it('reads an entrant a match introduced without seating them, and drops them with the match', async () => {
    const matchId = await createMatch(defaultPoolId, [entrantIdByName.get('Ann')]);

    const derived = await seats(defaultPoolId);
    expect(derived).toEqual([
      expect.objectContaining({ seedNum: null, slot: null, status: 'active', entrant: expect.objectContaining({ name: 'Ann' }) }),
    ]);

    await request(app.getHttpServer()).delete(`/matches/${matchId}`).expect(204);
    expect(await seats(defaultPoolId)).toEqual([]);
  });

  it('creating a match in a pool announces the pool and writes nothing into it', async () => {
    const events = await announcedBy(() =>
      request(app.getHttpServer())
        .post('/matches')
        .send({
          name: 'Set 2',
          phaseGroupId: defaultPoolId,
          scoringSystem: 'PlacementPointsWithFailZero',
          entrantIds: [entrantIdByName.get('Bob')],
        })
        .expect(201),
    );

    expect(events.map((event) => event.type)).toEqual(['ui.phase-group-changed']);
    const rows = await dataSource.query('SELECT COUNT(*)::int AS "count" FROM "phase_group_entrant" WHERE "phaseGroupId" = $1', [
      defaultPoolId,
    ]);
    expect(rows[0].count).toBe(0);
  });

  it('seats the entrants a generated bracket puts in a pool', async () => {
    const generated = await request(app.getHttpServer())
      .post(`/divisions/${divisionId}/generate-bracket`)
      .send({ bracketType: 'SingleElimination', phaseName: 'Finals', playerPerMatch: 2 })
      .expect(201);

    const seated = await seats(generated.body.phaseGroupId);
    expect(seated.map((seat) => [seat.entrant.name, Number(seat.seedNum), Number(seat.slot)])).toEqual([
      ['Ann', 1, 1],
      ['Bob', 2, 2],
    ]);
  });

  it('announces the pool a rule leaves, whether the rule leaves a match or the pool itself', async () => {
    const sourceMatchId = await createMatch(defaultPoolId, [entrantIdByName.get('Ann')]);
    const targetPool = await request(app.getHttpServer()).post(`/phases/${phaseId}/phase-groups`).send({}).expect(201);

    const fromMatch = await announcedBy(() =>
      request(app.getHttpServer())
        .put(`/advancement-rules/sources/match/${sourceMatchId}`)
        .send({ rules: [{ sourcePlacement: 1, targetKind: 'phase_group', targetId: targetPool.body.id, targetSlot: 1 }] })
        .expect(204),
    );
    expect(fromMatch.map((event) => event.type)).toEqual(['ui.phase-group-changed']);
    expect(fromMatch[0].payload).toEqual({ tournamentId, divisionId, phaseId, phaseGroupId: defaultPoolId });

    const fromPool = await announcedBy(() =>
      request(app.getHttpServer())
        .put(`/advancement-rules/sources/phase_group/${defaultPoolId}`)
        .send({ rules: [{ sourcePlacement: 1, targetKind: 'phase_group', targetId: targetPool.body.id, targetSlot: 1 }] })
        .expect(204),
    );
    expect(fromPool.map((event) => event.type)).toEqual(['ui.phase-group-changed']);
    expect(fromPool[0].payload).toEqual({ tournamentId, divisionId, phaseId, phaseGroupId: defaultPoolId });

    await request(app.getHttpServer()).delete(`/matches/${sourceMatchId}`).expect(204);
  });

  it('answers 404 for a rule whose source pool does not exist', async () => {
    await request(app.getHttpServer())
      .put('/advancement-rules/sources/phase_group/999999')
      .send({ rules: [] })
      .expect(404);
  });

  it('loads the pool once to rename it', async () => {
    const logger = dataSource.logger;
    let loads = 0;
    (dataSource as unknown as { logger: unknown }).logger = {
      ...logger,
      logQuery: (query: string) => {
        if (query.includes('"distinctAlias"."PhaseGroup_id"')) loads += 1;
      },
    };

    try {
      await request(app.getHttpServer()).patch(`/phase-groups/${defaultPoolId}`).send({ name: 'Pool A' }).expect(204);
    } finally {
      (dataSource as unknown as { logger: unknown }).logger = logger;
    }

    expect(loads).toBe(1);
  });
});
