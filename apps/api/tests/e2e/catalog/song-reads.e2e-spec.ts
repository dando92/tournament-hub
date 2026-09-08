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

const database = getTestDatabaseName('song_reads');

process.env.DATABASE_NAME = database;

describe('Song reads (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  let tournamentId: number;
  let otherTournamentId: number;

  beforeAll(async () => {
    const migrations = await resetMigratedTestDatabase(database);
    await migrations.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const accountRepository = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
    const credentials = {
      username: 'song-reads-owner',
      email: 'song-reads-owner@example.test',
      password: 'SongReadsPassword!',
      playerName: 'Song Reads Owner',
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

    tournamentId = await addTournament('Song Reads Tournament');
    otherTournamentId = await addTournament('Other Tournament');
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  async function addTournament(name: string): Promise<number> {
    const tournament = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name })
      .expect(201);

    return tournament.body.id;
  }

  async function addSong(
    targetTournamentId: number,
    song: { title: string; group: string; difficulty: number; artist?: string },
  ): Promise<number> {
    const created = await request(app.getHttpServer())
      .post('/songs')
      .send({ ...song, tournamentId: targetTournamentId })
      .expect(201);

    return created.body.id;
  }

  it('lists the pool of one tournament, by group then difficulty then title', async () => {
    const beta = await addSong(tournamentId, { title: 'beta', group: 'Pack A', difficulty: 12 });
    const alpha = await addSong(tournamentId, { title: 'Alpha', group: 'Pack A', difficulty: 12, artist: 'Composer' });
    const easier = await addSong(tournamentId, { title: 'Easier', group: 'Pack A', difficulty: 8 });
    const later = await addSong(tournamentId, { title: 'Later Pack Song', group: 'Pack B', difficulty: 1 });
    await addSong(otherTournamentId, { title: 'Not This Tournament', group: 'Pack A', difficulty: 1 });

    await request(app.getHttpServer())
      .get('/songs')
      .query({ tournamentId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((song) => song.id)).toEqual([easier, alpha, beta, later]);
        expect(body[1]).toEqual({
          id: alpha,
          title: 'Alpha',
          artist: 'Composer',
          difficulty: 12,
          chartDifficulty: null,
          group: 'Pack A',
        });
        expect(body[0].artist).toBeNull();
      });
  });

  it('answers with nothing for a tournament that has no songs', async () => {
    await request(app.getHttpServer())
      .get('/songs')
      .query({ tournamentId: 999999 })
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));
  });
});
