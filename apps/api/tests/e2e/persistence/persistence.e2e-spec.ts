import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AdvancementRule,
  Entrant,
  Match,
  MatchTiebreak,
  MatchTiebreakStanding,
  MatchResult,
  Participant,
  Player,
  Round,
  Score,
  Song,
  Standing,
  PhaseGroup,
} from '@tournament-hub/persistence';
import { MatchStore } from '@match/match.store';
import { ScoreQueries } from '@tournament/competition/score.queries';
import {
  dropTestDatabase,
  getTestDatabaseName,
  getTestDataSourceOptions,
  resetMigratedTestDatabase,
} from '../../support/postgres-test-database';

describe('Score and match-result persistence (e2e)', () => {
  const database = getTestDatabaseName('persistence');
  let app: INestApplication;
  let scoreQueries: ScoreQueries;
  let matchStore: MatchStore;
  let playerRepository: Repository<Player>;
  let songRepository: Repository<Song>;
  let scoreRepository: Repository<Score>;
  let roundRepository: Repository<Round>;
  let standingRepository: Repository<Standing>;
  let matchRepository: Repository<Match>;
  let matchResultRepository: Repository<MatchResult>;
  let participantRepository: Repository<Participant>;
  let entrantRepository: Repository<Entrant>;

  beforeAll(async () => {
    const migrations = await resetMigratedTestDatabase(database);
    await migrations.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDataSourceOptions(database)),
        TypeOrmModule.forFeature([
          AdvancementRule,
          Player,
          Song,
          Score,
          Match,
          MatchTiebreak,
          MatchTiebreakStanding,
          MatchResult,
          Round,
          Standing,
          Entrant,
          Participant,
          PhaseGroup,
        ]),
      ],
      providers: [ScoreQueries, MatchStore],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    scoreQueries = moduleFixture.get(ScoreQueries);
    matchStore = moduleFixture.get(MatchStore);
    playerRepository = moduleFixture.get(getRepositoryToken(Player));
    songRepository = moduleFixture.get(getRepositoryToken(Song));
    scoreRepository = moduleFixture.get(getRepositoryToken(Score));
    roundRepository = moduleFixture.get(getRepositoryToken(Round));
    standingRepository = moduleFixture.get(getRepositoryToken(Standing));
    matchRepository = moduleFixture.get(getRepositoryToken(Match));
    matchResultRepository = moduleFixture.get(getRepositoryToken(MatchResult));
    participantRepository = moduleFixture.get(getRepositoryToken(Participant));
    entrantRepository = moduleFixture.get(getRepositoryToken(Entrant));
  });

  afterAll(async () => {
    await app?.close();
    await dropTestDatabase(database);
  });

  it('offers the unassigned runs one player already has on one song, newest first', async () => {
    const player = await playerRepository.save(
      playerRepository.create({ playerName: 'Persistence Player' }),
    );
    const otherPlayer = await playerRepository.save(
      playerRepository.create({ playerName: 'Other Player' }),
    );
    const song = await songRepository.save(
      songRepository.create({
        title: 'Persistence Song',
        artist: 'Test Artist',
        group: 'Test Group',
        difficulty: 10,
      }),
    );
    const otherSong = await songRepository.save(
      songRepository.create({ title: 'Other Song', group: 'Test Group', difficulty: 8 }),
    );

    const first = await scoreRepository.save(
      scoreRepository.create({ player, song, percentage: 98.5, isFailed: false }),
    );
    const second = await scoreRepository.save(
      scoreRepository.create({ player, song, percentage: 75, isFailed: true }),
    );
    await scoreRepository.save(
      scoreRepository.create({ player: otherPlayer, song, percentage: 60, isFailed: false }),
    );
    await scoreRepository.save(
      scoreRepository.create({ player, song: otherSong, percentage: 50, isFailed: false }),
    );

    const match = await matchRepository.save(
      matchRepository.create({ name: 'Score Owner', scoringSystem: 'PlacementPointsWithFailZero' }),
    );
    const round = await roundRepository.save(roundRepository.create({ match, song }));
    await standingRepository.save(standingRepository.create({ round, player, score: first, points: 0 }));

    await expect(scoreQueries.history(song.id, player.id)).resolves.toEqual([
      { id: second.id, percentage: 75, isFailed: true },
    ]);
  });

  it('answers with nothing when the player has never run the song', async () => {
    await expect(scoreQueries.history(999999, 999999)).resolves.toEqual([]);
  });

  it('writes a match, its rounds and its result through one store', async () => {
    const player = await playerRepository.save(playerRepository.create({ playerName: 'Aggregate Player' }));
    const participant = await participantRepository.save(
      participantRepository.create({ player, roles: [], status: 'registered' }),
    );
    const entrant = await entrantRepository.save(
      entrantRepository.create({ name: 'Aggregate Entrant', type: 'player', participants: [participant] }),
    );
    const stored = await matchRepository.save(
      matchRepository.create({
        name: 'Aggregate Match',
        scoringSystem: 'PlacementPointsWithFailZero',
        active: true,
        entrants: [entrant],
      }),
    );

    const match = await matchStore.loadOrFail(stored.id);
    match.addRound(null);
    await matchStore.save(match);

    const withRound = await matchStore.loadOrFail(stored.id);
    const roundId = withRound.rounds[0].id;
    withRound.upsertPoints(roundId, player, 3);
    withRound.commit();
    await matchStore.save(withRound);

    const committed = await matchStore.loadOrFail(stored.id);
    expect(committed.entity.active).toBe(false);
    expect(committed.entity.matchResult.playerPoints).toEqual([{ playerId: player.id, points: 3, placement: 1 }]);
    expect(committed.rounds[0].standings[0].points).toBe(3);
    await expect(matchResultRepository.count()).resolves.toBe(1);

    committed.reopen();
    await matchStore.save(committed);

    await expect(matchResultRepository.count()).resolves.toBe(0);
    await expect(matchStore.loadOrFail(stored.id)).resolves.toMatchObject({ isCompleted: false });

    const reopened = await matchStore.loadOrFail(stored.id);
    reopened.removeStanding(roundId, player.id);
    reopened.removeRound(roundId);
    await matchStore.save(reopened);

    await expect(matchStore.loadOrFail(stored.id)).resolves.toMatchObject({ rounds: [] });
  });
});
