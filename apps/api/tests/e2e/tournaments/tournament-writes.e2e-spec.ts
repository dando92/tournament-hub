import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { Account } from '@tournament-hub/persistence';
import { LIVE_EVENT_PUBLISHER } from '@tournament-hub/live-messaging';
import type { EventEnvelope } from '@tournament-hub/live-messaging';
import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

const database = getTestDatabaseName('tournament_writes');

process.env.DATABASE_NAME = database;

type ParticipantBody = {
  id: number;
  roles: string[];
  status: string;
  player: { id: number; playerName: string };
};

describe('Tournament writes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  let tournamentId: number;
  const published: EventEnvelope[] = [];

  async function announcedBy(send: () => request.Test): Promise<EventEnvelope[]> {
    published.length = 0;
    await send();

    return [...published];
  }

  function authorized(test: request.Test): request.Test {
    return test.set('Authorization', `Bearer ${accessToken}`);
  }

  async function participants(): Promise<ParticipantBody[]> {
    const response = await authorized(
      request(app.getHttpServer()).get(`/tournaments/${tournamentId}/participants`),
    ).expect(200);

    return response.body;
  }

  async function register(body: { playerName?: string; playerId?: number }): Promise<number> {
    const response = await authorized(
      request(app.getHttpServer()).post(`/tournaments/${tournamentId}/participants`).send(body),
    ).expect(201);

    return response.body.id;
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
      username: 'tournament-writes-owner',
      email: 'tournament-writes-owner@example.test',
      password: 'TournamentWritesPassword!',
      playerName: 'Tournament Writes Owner',
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
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  it('answers with the id of the tournament it made and registers its creator as owner', async () => {
    const created = await authorized(
      request(app.getHttpServer()).post('/tournaments').send({ name: 'Main Tournament' }),
    ).expect(201);
    tournamentId = created.body.id;

    expect(created.body).toEqual({ id: expect.any(Number) });

    const roster = await participants();
    expect(roster).toEqual([
      expect.objectContaining({
        roles: ['owner'],
        player: expect.objectContaining({ playerName: 'Tournament Writes Owner' }),
      }),
    ]);
  });

  it('announces the tournament when it is renamed', async () => {
    const events = await announcedBy(() =>
      authorized(request(app.getHttpServer()).patch(`/tournaments/${tournamentId}`).send({ name: 'Renamed' })).expect(204),
    );

    expect(events.map((event) => event.type)).toEqual(['ui.tournament-changed']);
    expect(events[0].payload).toEqual({ tournamentId });
  });

  it('registers somebody by name and answers with the participant id', async () => {
    const participantId = await register({ playerName: 'Ann' });

    expect(await participants()).toContainEqual(
      expect.objectContaining({ id: participantId, roles: ['competitor'], player: expect.objectContaining({ playerName: 'Ann' }) }),
    );
  });

  it('registers the same person twice as one participant', async () => {
    const first = await register({ playerName: 'Bob' });
    const again = await register({ playerName: '  bob  ' });

    expect(again).toBe(first);
    expect((await participants()).filter((each) => each.player.playerName === 'Bob')).toHaveLength(1);
  });

  it('refuses a registration that names nobody', async () => {
    await authorized(request(app.getHttpServer()).post(`/tournaments/${tournamentId}/participants`).send({})).expect(400);
  });

  it('grants and revokes a staff role, leaving somebody with no role as unknown', async () => {
    const participantId = await register({ playerName: 'Cal' });

    await authorized(
      request(app.getHttpServer()).post(`/tournaments/${tournamentId}/participants/${participantId}/staff`),
    ).expect(204);
    expect((await participants()).find((each) => each.id === participantId).roles).toEqual(['competitor', 'staff']);

    await authorized(
      request(app.getHttpServer()).delete(`/tournaments/${tournamentId}/participants/${participantId}/staff`),
    ).expect(204);
    expect((await participants()).find((each) => each.id === participantId).roles).toEqual(['competitor']);
  });

  it('takes somebody out of the divisions they competed in before unregistering them', async () => {
    const participantId = await register({ playerName: 'Dee' });
    const division = await authorized(
      request(app.getHttpServer()).post('/divisions').send({ name: 'Main Division', tournamentId }),
    ).expect(201);
    await request(app.getHttpServer())
      .post(`/divisions/${division.body.id}/participants`)
      .send({ participantIds: [participantId] })
      .expect(201);

    const events = await announcedBy(() =>
      authorized(
        request(app.getHttpServer()).delete(`/tournaments/${tournamentId}/participants/${participantId}`),
      ).expect(204),
    );

    expect(events.map((event) => event.type)).toEqual([
      'ui.division-changed',
      'ui.tournament-changed',
    ]);
    expect(await participants()).not.toContainEqual(expect.objectContaining({ id: participantId }));

    const entrants = await request(app.getHttpServer()).get(`/divisions/${division.body.id}/entrants`).expect(200);
    expect(entrants.body).toEqual([
      expect.objectContaining({ name: 'Dee', status: 'withdrawn', participants: [] }),
    ]);
  });

  it('says nothing when the person to unregister is not there', async () => {
    const events = await announcedBy(() =>
      authorized(request(app.getHttpServer()).delete(`/tournaments/${tournamentId}/participants/999999`)).expect(204),
    );

    expect(events).toEqual([]);
  });

  it('registers a whole imported list in one load of the tournament', async () => {
    const names = ['Eve', 'Fay', 'Gus', 'Hal', 'Ivy'];
    const logger = dataSource.logger;
    let loads = 0;
    (dataSource as unknown as { logger: unknown }).logger = {
      ...logger,
      logQuery: (query: string) => {
        if (query.includes('"distinctAlias"."Tournament_id"')) loads += 1;
      },
    };

    let imported: request.Response;
    try {
      imported = await authorized(
        request(app.getHttpServer())
          .post(`/tournaments/${tournamentId}/participants/import`)
          .send({ entries: names.map((name) => ({ name })) }),
      ).expect(201);
    } finally {
      (dataSource as unknown as { logger: unknown }).logger = logger;
    }

    expect(imported.body).toHaveLength(names.length);
    expect(loads).toBe(1);
    const roster = (await participants()).map((each) => each.player.playerName);
    expect(names.every((name) => roster.includes(name))).toBe(true);
  });

  it('announces a tournament that closes, and nothing for one that was closed already', async () => {
    const events = await announcedBy(() =>
      authorized(request(app.getHttpServer()).post(`/tournaments/${tournamentId}/close`)).expect(204),
    );
    expect(events.map((event) => event.type)).toEqual(['ui.tournament-changed']);

    const again = await announcedBy(() =>
      authorized(request(app.getHttpServer()).post(`/tournaments/${tournamentId}/close`)).expect(204),
    );
    expect(again).toEqual([]);
  });

  it('refuses a change to a closed tournament, and takes it once it is reopened', async () => {
    await authorized(request(app.getHttpServer()).patch(`/tournaments/${tournamentId}`).send({ name: 'Nope' })).expect(409);

    const events = await announcedBy(() =>
      authorized(request(app.getHttpServer()).post(`/tournaments/${tournamentId}/reopen`)).expect(204),
    );
    expect(events.map((event) => event.type)).toEqual(['ui.tournament-changed']);

    await authorized(request(app.getHttpServer()).patch(`/tournaments/${tournamentId}`).send({ name: 'Reopened' })).expect(204);
  });
});
