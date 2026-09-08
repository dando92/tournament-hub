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

const database = getTestDatabaseName('player_catalogue');

process.env.DATABASE_NAME = database;

describe('Player catalogue (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  let tournamentId: number;
  let divisionId: number;

  async function playerNames(): Promise<string[]> {
    const players = await request(app.getHttpServer()).get('/players').expect(200);

    return players.body.map((player: { playerName: string }) => player.playerName);
  }

  async function entrantNames(): Promise<string[]> {
    const entrants = await request(app.getHttpServer()).get(`/divisions/${divisionId}/entrants`).expect(200);

    return entrants.body.map((entrant: { name: string }) => entrant.name);
  }

  async function statementsOf(send: () => request.Test): Promise<string[]> {
    const logger = dataSource.logger;
    const statements: string[] = [];
    (dataSource as unknown as { logger: unknown }).logger = {
      ...logger,
      logQuery: (query: string) => statements.push(query),
    };

    try {
      await send();
    } finally {
      (dataSource as unknown as { logger: unknown }).logger = logger;
    }

    return statements;
  }

  const touching = (statements: string[], table: string): string[] =>
    statements.filter((statement) => statement.includes(`"${table}"`));

  beforeAll(async () => {
    const migrations = await resetMigratedTestDatabase(database);
    await migrations.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LIVE_EVENT_PUBLISHER)
      .useValue({ publish: (_event: EventEnvelope) => Promise.resolve() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    const accountRepository = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
    const credentials = {
      username: 'player-catalogue-owner',
      email: 'player-catalogue-owner@example.test',
      password: 'PlayerCataloguePassword!',
      playerName: 'Player Catalogue Owner',
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
      .send({ name: 'Player Catalogue Tournament' })
      .expect(201);
    tournamentId = tournament.body.id;

    const division = await request(app.getHttpServer())
      .post('/divisions')
      .send({ name: 'Main Division', tournamentId })
      .expect(201);
    divisionId = division.body.id;
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  it('answers with the name and nothing else, in the order the names read', async () => {
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/participants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName: 'Zoe' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/participants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName: 'Ann' })
      .expect(201);

    const players = await request(app.getHttpServer()).get('/players').expect(200);

    expect(players.body).toContainEqual({ id: expect.any(Number), playerName: 'Ann', nationality: '' });
    expect(players.body.every((player: object) => Object.keys(player).length === 3)).toBe(true);
    expect(await playerNames()).toEqual(['Ann', 'Player Catalogue Owner', 'Zoe']);
  });

  it('registers the person the catalogue already holds when a name is typed again', async () => {
    const before = (await playerNames()).length;

    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/participants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName: '  ann  ' })
      .expect(201);

    expect((await playerNames()).length).toBe(before);
  });

  it('matches a pasted name against the catalogue however it was capitalized', async () => {
    const added = await request(app.getHttpServer())
      .post(`/players/divisions/${divisionId}/bulk`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerNames: ['ANN', 'Bea Ryder'] })
      .expect(201);

    expect(added.body.warnings).toEqual(['ANN']);
    expect(await playerNames()).toContain('Bea Ryder');
    expect(await playerNames()).not.toContain('bea ryder');
    expect(await entrantNames()).toEqual(expect.arrayContaining(['Ann', 'Bea Ryder']));
  });

  it('asks the catalogue once and inserts once, whatever the length of the list', async () => {
    const three = await statementsOf(() => request(app.getHttpServer())
      .post(`/players/divisions/${divisionId}/bulk`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerNames: ['Cal', 'Dee', 'Eve'] })
      .expect(201));

    const six = await statementsOf(() => request(app.getHttpServer())
      .post(`/players/divisions/${divisionId}/bulk`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerNames: ['Fay', 'Gus', 'Hal', 'Ivy', 'Jon', 'Kim'] })
      .expect(201));

    expect(touching(six, 'player').length).toBe(touching(three, 'player').length);
    expect(touching(six, 'player').filter((statement) => statement.startsWith('INSERT'))).toHaveLength(1);
  });

  it('registers somebody in the tournament before their division admits them', async () => {
    await request(app.getHttpServer())
      .post(`/players/divisions/${divisionId}/bulk`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerNames: ['Lena'] })
      .expect(201);
    const catalogue = await request(app.getHttpServer()).get('/players').expect(200);
    const playerId = catalogue.body
      .find((player: { playerName: string }) => player.playerName === 'Lena').id;

    const other = await request(app.getHttpServer())
      .post('/divisions')
      .send({ name: 'Second Division', tournamentId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/players/${playerId}/divisions/${other.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const participants = await request(app.getHttpServer())
      .get(`/tournaments/${tournamentId}/participants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(participants.body.filter((participant: { player: { id: number } }) => participant.player.id === playerId))
      .toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/players/${playerId}/divisions/${other.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const entrants = await request(app.getHttpServer()).get(`/divisions/${other.body.id}/entrants`).expect(200);
    expect(entrants.body).toEqual([expect.objectContaining({ name: 'Lena', status: 'withdrawn' })]);
  });
});
