import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { Account } from '@tournament-hub/persistence';
import { LIVE_EVENT_PUBLISHER } from '@tournament-hub/live-messaging';
import type { EventEnvelope } from '@tournament-hub/live-messaging';
import {
  dropTestDatabase,
  getTestDatabaseName,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

const database = getTestDatabaseName('song_writes');

process.env.DATABASE_NAME = database;

describe('Song writes (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  let tournamentId: number;
  let divisionId: number;
  let poolId: number;
  let entrantId: number;
  const published: EventEnvelope[] = [];

  async function addSong(title: string, group: string, difficulty: number, target?: number): Promise<number> {
    const created = await request(app.getHttpServer())
      .post('/songs')
      .send({ title, artist: 'Someone', group, difficulty, tournamentId: target ?? tournamentId })
      .expect(201);

    return created.body.id;
  }

  async function createMatch(): Promise<number> {
    const match = await request(app.getHttpServer())
      .post('/matches')
      .send({ name: 'Set', phaseGroupId: poolId, scoringSystem: 'PlacementPointsWithFailZero', entrantIds: [entrantId] })
      .expect(201);

    return match.body.id;
  }

  async function songsOf(matchId: number): Promise<Array<number | null>> {
    const match = await request(app.getHttpServer()).get(`/matches/${matchId}`).expect(200);

    return match.body.rounds.map((round: { song: { id: number } | null }) => round.song?.id ?? null);
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

    const accountRepository = moduleFixture.get<Repository<Account>>(getRepositoryToken(Account));
    const credentials = {
      username: 'song-writes-owner',
      email: 'song-writes-owner@example.test',
      password: 'SongWritesPassword!',
      playerName: 'Song Writes Owner',
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
      .send({ name: 'Song Writes Tournament' })
      .expect(201);
    tournamentId = tournament.body.id;

    const division = await request(app.getHttpServer())
      .post('/divisions')
      .send({ name: 'Main Division', tournamentId })
      .expect(201);
    divisionId = division.body.id;

    const participant = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/participants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ playerName: 'Ann' })
      .expect(201);
    const entrant = await request(app.getHttpServer())
      .post(`/divisions/${divisionId}/participants`)
      .send({ participantIds: [participant.body.id] })
      .expect(201);
    entrantId = entrant.body[0].id;

    await request(app.getHttpServer()).post('/phases').send({ name: 'Qualifiers', divisionId }).expect(201);
    const summary = await request(app.getHttpServer()).get(`/divisions/${divisionId}/summary`).expect(200);
    poolId = summary.body.phases[0].phaseGroups[0].id;
  });

  afterAll(async () => {
    await app.close();
    await dropTestDatabase(database);
  });

  it('adds a song to the pool of one tournament and announces that catalogue', async () => {
    published.length = 0;
    const songId = await addSong('Anthem', 'Pack A', 5);

    const pool = await request(app.getHttpServer()).get('/songs').query({ tournamentId }).expect(200);
    expect(pool.body).toContainEqual({
      id: songId,
      title: 'Anthem',
      artist: 'Someone',
      difficulty: 5,
      chartDifficulty: null,
      group: 'Pack A',
    });
    expect(published).toEqual([
      { type: 'ui.songs-changed', tournamentId, payload: { tournamentId } },
    ]);
  });

  it('imports a folder of charts in one write, keeping the difficulty each chart was written for', async () => {
    published.length = 0;
    const songs = [
      { title: 'Import Pack/First', artist: 'Composer', group: 'Import Pack', difficulty: 9, chartDifficulty: 'Hard' },
      { title: 'Import Pack/First', artist: 'Composer', group: 'Import Pack', difficulty: 13, chartDifficulty: 'Expert' },
      { title: 'Import Pack/Second', artist: 'Composer', group: 'Import Pack', difficulty: 3, chartDifficulty: 'Novice' },
    ];

    const imported = await request(app.getHttpServer())
      .post('/songs/import')
      .send({ tournamentId, songs })
      .expect(200);
    expect(imported.body).toEqual({ imported: 3, skipped: 0 });

    const pool = await request(app.getHttpServer()).get('/songs').query({ tournamentId }).expect(200);
    const packRows = pool.body
      .filter((song: { group: string }) => song.group === 'Import Pack')
      .map((song: { title: string; difficulty: number; chartDifficulty: string }) => [
        song.title,
        song.difficulty,
        song.chartDifficulty,
      ]);
    expect(packRows).toEqual([
      ['Import Pack/Second', 3, 'Novice'],
      ['Import Pack/First', 9, 'Hard'],
      ['Import Pack/First', 13, 'Expert'],
    ]);
    expect(published).toEqual([
      { type: 'ui.songs-changed', tournamentId, payload: { tournamentId } },
    ]);
  });

  it('adds nothing the second time the same folder is imported', async () => {
    const songs = [
      { title: 'Repeat Pack/Song', artist: 'Composer', group: 'Repeat Pack', difficulty: 11, chartDifficulty: 'Expert' },
    ];

    await request(app.getHttpServer()).post('/songs/import').send({ tournamentId, songs }).expect(200);
    published.length = 0;
    const again = await request(app.getHttpServer())
      .post('/songs/import')
      .send({ tournamentId, songs })
      .expect(200);

    expect(again.body).toEqual({ imported: 0, skipped: 1 });
    expect(published).toEqual([]);
    const pool = await request(app.getHttpServer()).get('/songs').query({ tournamentId }).expect(200);
    expect(pool.body.filter((song: { group: string }) => song.group === 'Repeat Pack')).toHaveLength(1);
  });

  it('refuses the whole import when one chart names a difficulty the application does not know', async () => {
    await request(app.getHttpServer())
      .post('/songs/import')
      .send({
        tournamentId,
        songs: [
          { title: 'Bad Pack/Good', group: 'Bad Pack', difficulty: 9, chartDifficulty: 'Hard' },
          { title: 'Bad Pack/Bad', group: 'Bad Pack', difficulty: 9, chartDifficulty: 'Ultra' },
        ],
      })
      .expect(400);

    const pool = await request(app.getHttpServer()).get('/songs').query({ tournamentId }).expect(200);
    expect(pool.body.filter((song: { group: string }) => song.group === 'Bad Pack')).toEqual([]);
  });

  it('refuses an import for a tournament that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/songs/import')
      .send({
        tournamentId: 999999,
        songs: [{ title: 'Nowhere/Song', group: 'Nowhere', difficulty: 9, chartDifficulty: 'Hard' }],
      })
      .expect(404);
  });

  it('refuses a song for a tournament that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/songs')
      .send({ title: 'Nowhere', group: 'Pack A', difficulty: 5, tournamentId: 999999 })
      .expect(404);
  });

  it('takes a song out of the pool', async () => {
    const songId = await addSong('Leaving', 'Pack A', 6);
    published.length = 0;

    await request(app.getHttpServer()).delete(`/songs/${songId}`).expect(204);

    const pool = await request(app.getHttpServer()).get('/songs').query({ tournamentId }).expect(200);
    expect(pool.body.map((song: { id: number }) => song.id)).not.toContain(songId);
    expect(published).toEqual([
      { type: 'ui.songs-changed', tournamentId, payload: { tournamentId } },
    ]);
  });

  it('rolls a song of the level asked for, from the pool of the division the match is in', async () => {
    const songId = await addSong('Rolled', 'Roll Pack', 11);
    const matchId = await createMatch();

    await request(app.getHttpServer())
      .post(`/matches/${matchId}/rounds`)
      .send({ group: 'Roll Pack', level: '11' })
      .expect(204);

    expect(await songsOf(matchId)).toEqual([songId]);
  });

  it('does not roll a song the division has already played', async () => {
    const first = await addSong('Once', 'Second Pack', 12);
    const played = await createMatch();
    await request(app.getHttpServer())
      .post(`/matches/${played}/rounds`)
      .send({ group: 'Second Pack', level: '12' })
      .expect(204);
    expect(await songsOf(played)).toEqual([first]);

    const second = await addSong('Twice', 'Second Pack', 12);
    const next = await createMatch();
    await request(app.getHttpServer())
      .post(`/matches/${next}/rounds`)
      .send({ group: 'Second Pack', level: '12' })
      .expect(204);

    expect(await songsOf(next)).toEqual([second]);
  });

  it('adds no round at all when nothing of that level is left to play', async () => {
    const matchId = await createMatch();

    await request(app.getHttpServer())
      .post(`/matches/${matchId}/rounds`)
      .send({ group: 'Roll Pack', level: '19' })
      .expect(204);

    expect(await songsOf(matchId)).toEqual([]);
  });

  it('does not roll the pool of another tournament', async () => {
    const other = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Other Tournament' })
      .expect(201);
    await addSong('Elsewhere', 'Foreign Pack', 13, other.body.id);

    const matchId = await createMatch();
    await request(app.getHttpServer())
      .post(`/matches/${matchId}/rounds`)
      .send({ group: 'Foreign Pack', level: '13' })
      .expect(204);

    expect(await songsOf(matchId)).toEqual([]);
  });
  describe('drawing before writing', () => {
    it('answers one slot per level, and leaves the match alone', async () => {
      const first = await addSong('Preview One', 'Preview Pack', 7);
      const second = await addSong('Preview Two', 'Preview Pack', 7);
      const matchId = await createMatch();

      const drawn = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, group: 'Preview Pack', levels: [7, 7], matchId })
        .expect(200);

      expect(drawn.body.map((slot: { level: number }) => slot.level)).toEqual([7, 7]);
      expect(drawn.body.map((slot: { song: { id: number } }) => slot.song.id).sort()).toEqual([first, second].sort());
      expect(drawn.body[0].song).toEqual({
        id: drawn.body[0].song.id,
        title: expect.any(String),
        artist: 'Someone',
        difficulty: 7,
        chartDifficulty: null,
        group: 'Preview Pack',
      });
      expect(await songsOf(matchId)).toEqual([]);
    });

    it('answers an empty slot for a level the pool cannot fill', async () => {
      const drawn = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, group: 'Preview Pack', levels: [7, 18] })
        .expect(200);

      expect(drawn.body[1]).toEqual({ level: 18, song: null });
    });

    it('offers a song the division has already played only when asked to', async () => {
      const song = await addSong('Played Once', 'Replay Pack', 14);
      const played = await createMatch();
      await request(app.getHttpServer())
        .post(`/matches/${played}/rounds`)
        .send({ group: 'Replay Pack', level: '14' })
        .expect(204);
      expect(await songsOf(played)).toEqual([song]);

      const withoutFlag = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, group: 'Replay Pack', levels: [14] })
        .expect(200);
      expect(withoutFlag.body).toEqual([{ level: 14, song: null }]);

      const withFlag = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, group: 'Replay Pack', levels: [14], allowPlayed: true })
        .expect(200);
      expect(withFlag.body[0].song.id).toEqual(song);
    });

    it('never offers a song the match it draws for already holds', async () => {
      const song = await addSong('Held', 'Held Pack', 15);
      const matchId = await createMatch();
      await request(app.getHttpServer())
        .post(`/matches/${matchId}/rounds`)
        .send({ group: 'Held Pack', level: '15' })
        .expect(204);
      expect(await songsOf(matchId)).toEqual([song]);

      const drawn = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, group: 'Held Pack', levels: [15], allowPlayed: true, matchId })
        .expect(200);

      expect(drawn.body).toEqual([{ level: 15, song: null }]);
    });

    it('leaves out the cards the caller is already holding', async () => {
      const kept = await addSong('Kept', 'Reroll Pack', 16);
      const other = await addSong('Other', 'Reroll Pack', 16);

      const drawn = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, group: 'Reroll Pack', levels: [16], excludeSongIds: [kept] })
        .expect(200);

      expect(drawn.body[0].song.id).toEqual(other);
    });

    it('draws from the whole pool when no pack is named', async () => {
      const drawn = await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId, levels: [7] })
        .expect(200);

      expect(drawn.body[0].song.group).toEqual('Preview Pack');
    });

    it('refuses a draw for a division that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/songs/roll')
        .send({ divisionId: 999999, levels: [7] })
        .expect(404);
    });
  });
});
