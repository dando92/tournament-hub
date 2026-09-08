import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { Account } from '@tournament-hub/persistence';
import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

const database = getTestDatabaseName('account_auth');
process.env.DATABASE_NAME = database;

describe('Account and authentication (e2e)', () => {
  let app: INestApplication;
  let accounts: Repository<Account>;
  let accountId: string;
  let accessToken: string;
  let registration: request.Response;

  const credentials = {
    username: 'MixedCaseAdmin',
    email: 'admin@example.test',
    password: 'AccountPassword!',
    playerName: 'Tournament Admin',
  };

  beforeAll(async () => {
    const migrations = await resetMigratedTestDatabase(database);
    await migrations.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    accounts = moduleFixture.get<Repository<Account>>(
      getRepositoryToken(Account),
    );
    registration = await request(app.getHttpServer())
      .post('/user')
      .send(credentials)
      .expect(201);
    accountId = registration.body.id;

    const account = await accounts.findOneByOrFail({ id: accountId });
    account.isAdmin = true;
    await accounts.save(account);

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

  it('registers one normalized account and never exposes its password', async () => {
    expect(registration.body).toEqual({
      id: accountId,
      username: credentials.username.toLowerCase(),
      grooveStatsApi: '',
      profilePicture: '',
      player: { id: expect.any(Number), playerName: credentials.playerName, nationality: '' },
    });
    expect(registration.body).not.toHaveProperty('password');

    await request(app.getHttpServer())
      .post('/user')
      .send(credentials)
      .expect(422);
  });

  it('rejects invalid credentials and returns the signed-in account projections', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'missing', password: 'wrong' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          id: accountId,
          username: credentials.username.toLowerCase(),
        }),
      );

    await request(app.getHttpServer())
      .get('/auth/permissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ isAdmin: true, isTournamentCreator: false });
  });

  it('updates only the signed-in account profile', async () => {
    await request(app.getHttpServer())
      .patch('/user/someone-else/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName: 'Forbidden' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/user/${accountId}/profile`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName: 'Updated Admin', nationality: 'IT' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          id: accountId,
          player: { playerName: 'Updated Admin', nationality: 'IT' },
        }),
      );
  });

  it('lets an administrator list accounts and change their flags', async () => {
    const created = await request(app.getHttpServer())
      .post('/user')
      .send({
        username: 'creator',
        email: 'creator@example.test',
        password: 'CreatorPassword!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/user/${created.body.id}/flags`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isTournamentCreator: true })
      .expect(200)
      .expect({
        id: created.body.id,
        username: 'creator',
        isAdmin: false,
        isTournamentCreator: true,
      });

    await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toContainEqual({
          id: created.body.id,
          username: 'creator',
          isAdmin: false,
          isTournamentCreator: true,
        });
        expect(body[0]).not.toHaveProperty('password');
      });
  });
});
