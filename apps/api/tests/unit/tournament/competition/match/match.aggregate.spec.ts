import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdvancementRule, Entrant, Match, MatchResult, Player, Round, Score, Song, Standing } from '@tournament-hub/persistence';
import { ScoringSystemProvider } from '@tournament-hub/scoring';

import { MatchAggregate } from '@match/match.aggregate';

const PLAYED_ROUND_ID = 30;
const HAND_SCORED_ROUND_ID = 31;
const SONG = { id: 10, title: 'Test Song' } as Song;

function player(id: number): Player {
  return { id, playerName: `Player ${id}` } as Player;
}

function entrant(id: number, playerId: number): Entrant {
  return {
    id,
    name: `Entrant ${id}`,
    type: 'player',
    participants: [{ player: player(playerId) }],
  } as Entrant;
}

function score(id: number, scorePlayer: Player, percentage: number, song: Song = SONG): Score {
  return { id, player: scorePlayer, song, percentage, isFailed: false } as Score;
}

function standing(id: number, standingPlayer: Player, standingScore?: Score, points = 0): Standing {
  return { id, player: standingPlayer, score: standingScore ?? null, points } as Standing;
}

function playedRound(standings: Standing[] = []): Round {
  return { id: PLAYED_ROUND_ID, song: SONG, standings } as Round;
}

function handScoredRound(standings: Standing[] = []): Round {
  return { id: HAND_SCORED_ROUND_ID, song: null, standings } as Round;
}

function match(entrants: Entrant[], rounds: Round[], result: MatchResult | null = null, rules: AdvancementRule[] = []): MatchAggregate {
  return MatchAggregate.of({
    id: 20,
    name: 'Test Match',
    active: false,
    scoringSystem: 'PlacementPointsWithFailZero',
    entrants,
    rounds,
    tiebreaks: [],
    matchResult: result,
  } as Match, rules);
}

function advancementRule(sourcePlacement: number, targetId: number): AdvancementRule {
  return {
    id: sourcePlacement,
    sourceKind: 'match',
    sourceId: 20,
    sourcePlacement,
    targetKind: 'match',
    targetId,
    targetSlot: 1,
  } as AdvancementRule;
}

function scoringSystems(recalc: jest.Mock): ScoringSystemProvider {
  return { getScoringSystem: () => ({ recalc }) } as unknown as ScoringSystemProvider;
}

describe('MatchAggregate', () => {
  describe('state', () => {
    const scoredPlayer = player(101);
    const otherPlayer = player(102);
    const field = [entrant(1, 101), entrant(2, 102)];

    it('is open while the match holds nothing anybody played', () => {
      expect(match(field, []).state).toBe('open');
      expect(match(field, [playedRound()]).state).toBe('open');
      expect(match(field, [handScoredRound([standing(200, scoredPlayer, undefined, 0)])]).state).toBe('open');
    });

    it('is partial while a round waits for somebody', () => {
      const partial = match(field, [playedRound([standing(200, scoredPlayer, score(100, scoredPlayer, 99))])]);

      expect(partial.state).toBe('partial');
    });

    it('is ready once every round is settled and nothing depends on a tie', () => {
      const settled = match(field, [playedRound([
        standing(200, scoredPlayer, score(100, scoredPlayer, 99)),
        standing(201, otherPlayer, score(101, otherPlayer, 98)),
      ])]);

      expect(settled.state).toBe('ready');
    });

    it('is tiebreak_required when a rule leaving the match splits the tied players', () => {
      const standings = [
        standing(200, scoredPlayer, score(100, scoredPlayer, 99)),
        standing(201, otherPlayer, score(101, otherPlayer, 99)),
      ];

      expect(match(field, [playedRound(standings)]).state).toBe('ready');
      expect(match(field, [playedRound(standings)], null, [advancementRule(1, 40)]).state).toBe('tiebreak_required');
    });

    it('is completed once the result is written', () => {
      const completed = match(field, [playedRound()], { id: 1, playerPoints: [] } as MatchResult);

      expect(completed.state).toBe('completed');
    });
  });

  describe('pool projection state', () => {
    it('counts played scores and positive hand-scored points as progress', () => {
      const scoredPlayer = player(101);
      const played = match(
        [entrant(1, 101)],
        [playedRound([standing(200, scoredPlayer, score(100, scoredPlayer, 0))])],
      );
      const stated = match(
        [entrant(1, 101)],
        [handScoredRound([standing(201, scoredPlayer, undefined, 1)])],
      );

      expect(played.poolState.progressed).toBe(true);
      expect(stated.poolState.progressed).toBe(true);
    });

    it('does not count configured rounds or zero hand-scored points as progress', () => {
      const configured = match([entrant(1, 101)], [playedRound()]);
      const zero = match(
        [entrant(1, 101)],
        [handScoredRound([standing(200, player(101), undefined, 0)])],
      );

      expect(configured.poolState.progressed).toBe(false);
      expect(zero.poolState.progressed).toBe(false);
    });
  });

  describe('editing', () => {
    it('refuses to change a match that already holds a result', () => {
      const completed = match([entrant(1, 101)], [], { id: 5, playerPoints: [] } as MatchResult);

      expect(() => completed.assertEditable()).toThrow(BadRequestException);
    });

    it('allows a match with no result to be changed', () => {
      expect(() => match([entrant(1, 101)], []).assertEditable()).not.toThrow();
    });

    it('recalculates every complete played round after changing scoring system', () => {
        const recalc = jest.fn();
        const first = player(101);
        const second = player(102);
        const completeRound = playedRound([
            standing(200, first, score(100, first, 99), 2),
            standing(201, second, score(101, second, 98), 1),
        ]);
        const incompleteRound = { id: 32, song: SONG, standings: [standing(202, first, score(102, first, 97), 2)] } as Round;
        const statedRound = handScoredRound([standing(203, first, undefined, 7)]);
        const edited = match([entrant(1, 101), entrant(2, 102)], [completeRound, incompleteRound, statedRound]);

        edited.changeScoringSystem('PlacementPointsIncludingFails', scoringSystems(recalc));

        expect(edited.entity.scoringSystem).toBe('PlacementPointsIncludingFails');
        expect(recalc).toHaveBeenCalledTimes(1);
        expect(recalc).toHaveBeenCalledWith(completeRound.standings);
        expect(incompleteRound.standings[0].points).toBe(0);
        expect(statedRound.standings[0].points).toBe(7);
    });

    it('does not recalculate when the scoring system is unchanged', () => {
        const recalc = jest.fn();
        const edited = match([entrant(1, 101)], [playedRound()]);

        edited.changeScoringSystem('PlacementPointsWithFailZero', scoringSystems(recalc));

        expect(recalc).not.toHaveBeenCalled();
    });

    it('does not allow a completed match to be activated', () => {
      const completed = match([entrant(1, 101)], [], { id: 5, playerPoints: [] } as MatchResult);

      expect(() => completed.activate(true)).toThrow(
        new BadRequestException('Completed matches must be re-opened before activation'),
      );
    });
  });

  describe('rounds', () => {
    it('refuses a song on a match that is scored by hand', () => {
      const handScored = match([entrant(1, 101)], [handScoredRound()]);

      expect(() => handScored.assertRoundSourceAllowed(true)).toThrow(BadRequestException);
    });

    it('refuses hand scoring on a match that already has songs', () => {
      const played = match([entrant(1, 101)], [playedRound()]);

      expect(() => played.assertRoundSourceAllowed(false)).toThrow(BadRequestException);
    });

    it('adds a round with its song and one without it', () => {
      const empty = match([entrant(1, 101)], []);

      expect(empty.addRound(SONG).song).toBe(SONG);
      expect(empty.addRound(null).song).toBeNull();
      expect(empty.rounds).toHaveLength(2);
    });

    it('refuses to remove a round that still holds scores for its song', () => {
      const scored = match([entrant(1, 101)], [playedRound([standing(200, player(101), score(100, player(101), 99))])]);

      expect(() => scored.removeRound(PLAYED_ROUND_ID)).toThrow(BadRequestException);
      expect(scored.rounds).toHaveLength(1);
    });

    it('removes a hand-scored round even though points were stated in it', () => {
      const stated = match([entrant(1, 101)], [handScoredRound([standing(200, player(101), undefined, 3)])]);

      stated.removeRound(HAND_SCORED_ROUND_ID);

      expect(stated.rounds).toHaveLength(0);
      expect(stated.removals.roundIds).toEqual([HAND_SCORED_ROUND_ID]);
    });

    it('refuses a round the match does not hold', () => {
      expect(() => match([entrant(1, 101)], []).removeRound(999)).toThrow(NotFoundException);
    });
  });

  describe('scoring a round', () => {
    it('does not rank until every singles player has a standing', () => {
      const recalc = jest.fn();
      const scored = match([entrant(1, 101), entrant(2, 102)], [playedRound()]);
      const first = player(101);

      scored.upsertScore(PLAYED_ROUND_ID, first, score(undefined, first, 99), scoringSystems(recalc));

      expect(scored.rounds[0].standings).toHaveLength(1);
      expect(recalc).not.toHaveBeenCalled();
    });

    it('ranks the played standings once the round is complete', () => {
      const recalc = jest.fn();
      const first = player(101);
      const second = player(102);
      const existing = standing(200, first, score(100, first, 99));
      const scored = match([entrant(1, 101), entrant(2, 102)], [playedRound([existing])]);

      scored.upsertScore(PLAYED_ROUND_ID, second, score(undefined, second, 98), scoringSystems(recalc));

      expect(recalc).toHaveBeenCalledWith(scored.rounds[0].standings);
    });

    it('replaces the standing of a player instead of adding a second one', () => {
      const current = player(101);
      const existing = standing(200, current, score(100, current, 95), 1);
      const scored = match([entrant(1, 101)], [playedRound([existing])]);
      const replacement = score(101, current, 99);

      scored.upsertScore(PLAYED_ROUND_ID, current, replacement, scoringSystems(jest.fn()));

      expect(scored.rounds[0].standings).toHaveLength(1);
      expect(scored.rounds[0].standings[0].score).toBe(replacement);
    });

    it('refuses a played score on a hand-scored round', () => {
      const stated = match([entrant(1, 101)], [handScoredRound()]);
      const only = player(101);

      expect(() => stated.upsertScore(HAND_SCORED_ROUND_ID, only, score(1, only, 99), scoringSystems(jest.fn()))).toThrow(
        BadRequestException,
      );
    });

    it('refuses a score that belongs to another player or another song', () => {
      const scored = match([entrant(1, 101)], [playedRound()]);
      const only = player(101);
      const somebodyElse = score(1, player(102), 99);

      expect(() => scored.upsertScore(PLAYED_ROUND_ID, only, somebodyElse, scoringSystems(jest.fn()))).toThrow(
        BadRequestException,
      );
      expect(() =>
        scored.upsertScore(PLAYED_ROUND_ID, only, score(2, only, 99, { id: 11, title: 'Other' } as Song), scoringSystems(jest.fn())),
      ).toThrow(BadRequestException);
    });

    it('writes stated points on a hand-scored round without ranking anything', () => {
      const stated = match([entrant(1, 101)], [handScoredRound()]);

      stated.upsertPoints(HAND_SCORED_ROUND_ID, player(101), 7);

      expect(stated.rounds[0].standings[0]).toMatchObject({ points: 7, score: null });
    });

    it('refuses stated points on a round that has a song', () => {
      const scored = match([entrant(1, 101)], [playedRound()]);

      expect(() => scored.upsertPoints(PLAYED_ROUND_ID, player(101), 3)).toThrow(BadRequestException);
    });

    it('clears the ranking of a played round when one of its standings is removed', () => {
      const first = player(101);
      const second = player(102);
      const scored = match(
        [entrant(1, 101), entrant(2, 102)],
        [playedRound([standing(200, first, score(100, first, 99), 2), standing(201, second, score(101, second, 98), 1)])],
      );

      scored.removeStanding(PLAYED_ROUND_ID, first.id);

      expect(scored.rounds[0].standings).toHaveLength(1);
      expect(scored.rounds[0].standings[0].points).toBe(0);
      expect(scored.removals.standingIds).toEqual([200]);
    });

    it('leaves the stated points of a hand-scored round alone when one is removed', () => {
      const first = player(101);
      const second = player(102);
      const stated = match(
        [entrant(1, 101), entrant(2, 102)],
        [handScoredRound([standing(200, first, undefined, 3), standing(201, second, undefined, 1)])],
      );

      stated.removeStanding(HAND_SCORED_ROUND_ID, first.id);

      expect(stated.rounds[0].standings[0].points).toBe(1);
    });
  });

  describe('committing a result', () => {
    it('sums the standings of every round and orders the result by points', () => {
      const committed = match(
        [entrant(1, 101), entrant(2, 102)],
        [
          playedRound([standing(200, player(101), score(1, player(101), 99), 2), standing(201, player(102), score(2, player(102), 98), 1)]),
          { id: 32, song: { id: 11, title: 'Second' } as Song, standings: [standing(202, player(101), score(3, player(101), 90), 1), standing(203, player(102), score(4, player(102), 95), 2)] } as Round,
        ],
      );

      committed.commit();

      expect(committed.entity.matchResult.playerPoints).toEqual([
        { playerId: 102, points: 3, placement: 1 },
        { playerId: 101, points: 3, placement: 2 },
      ]);
      expect(committed.entity.active).toBe(false);
    });

    it('leaves a failed run out of the average that settles a tie', () => {
      const failed = { ...score(3, player(101), 90), isFailed: true } as Score;
      const committed = match(
        [entrant(1, 101), entrant(2, 102)],
        [
          playedRound([standing(200, player(101), score(1, player(101), 99), 2), standing(201, player(102), score(2, player(102), 98), 1)]),
          { id: 32, song: { id: 11, title: 'Second' } as Song, standings: [standing(202, player(101), failed, 1), standing(203, player(102), score(4, player(102), 95), 2)] } as Round,
        ],
      );

      committed.commit();

      expect(committed.entity.matchResult.playerPoints).toEqual([
        { playerId: 101, points: 3, placement: 1 },
        { playerId: 102, points: 3, placement: 2 },
      ]);
    });

    it('keeps a hand-scored tie tied, because there is nothing to average', () => {
      const committed = match(
        [entrant(1, 101), entrant(2, 102)],
        [handScoredRound([standing(200, player(101), undefined, 3), standing(201, player(102), undefined, 3)])],
      );

      committed.commit();

      expect(committed.entity.matchResult.playerPoints).toEqual([
        { playerId: 101, points: 3, placement: 1 },
        { playerId: 102, points: 3, placement: 1 },
      ]);
    });

    it('refuses a match whose played round is missing a player standing', () => {
      const waiting = match([entrant(1, 101), entrant(2, 102)], [playedRound([standing(200, player(101), score(1, player(101), 99), 2)])]);

      expect(() => waiting.commit()).toThrow(
        new BadRequestException('Match 20 cannot be completed because not all standings are populated'),
      );
    });

    it('sums a hand-scored round exactly like a played one', () => {
      const stated = match(
        [entrant(1, 101), entrant(2, 102)],
        [handScoredRound([standing(200, player(101), undefined, 3), standing(201, player(102), undefined, 1)])],
      );

      stated.commit();

      expect(stated.entity.matchResult.playerPoints).toEqual([
        { playerId: 101, points: 3, placement: 1 },
        { playerId: 102, points: 1, placement: 2 },
      ]);
    });

    it('completes a hand-scored match that nobody but the winner has points in', () => {
      const stated = match([entrant(1, 101), entrant(2, 102)], [handScoredRound([standing(200, player(101), undefined, 1)])]);

      stated.commit();

      expect(stated.entity.matchResult.playerPoints).toEqual([
        { playerId: 101, points: 1, placement: 1 },
        { playerId: 102, points: 0, placement: 2 },
      ]);
    });

    it('refuses a hand-scored match while every point is zero', () => {
      const stated = match(
        [entrant(1, 101), entrant(2, 102)],
        [handScoredRound([standing(200, player(101), undefined, 0), standing(201, player(102), undefined, 0)])],
      );

      expect(() => stated.commit()).toThrow(BadRequestException);
    });

    it('refuses a match that has no rounds at all', () => {
      expect(() => match([entrant(1, 101)], []).commit()).toThrow(BadRequestException);
    });

    it('requires a tiebreak when equal points feed different advancement destinations', () => {
      const tied = match(
        [entrant(1, 101), entrant(2, 102)],
        [handScoredRound([standing(200, player(101), undefined, 1), standing(201, player(102), undefined, 1)])],
        null,
        [advancementRule(1, 30), advancementRule(2, 40)],
      );

      expect(tied.resultState.status).toBe('tiebreak_required');
      expect(() => tied.commit()).toThrow(BadRequestException);
    });

    it('uses manual tiebreak values to build placements without changing points', () => {
      const first = player(101);
      const second = player(102);
      const tied = match(
        [entrant(1, first.id), entrant(2, second.id)],
        [handScoredRound([standing(200, first, undefined, 1), standing(201, second, undefined, 1)])],
        null,
        [advancementRule(1, 30), advancementRule(2, 40)],
      );
      const tiebreak = tied.addTiebreak(null, [first, second]);
      tiebreak.id = 50;
      tied.upsertTiebreakPoints(50, first.id, 2);
      tied.upsertTiebreakPoints(50, second.id, 3);

      tied.commit();

      expect(tied.entity.matchResult.playerPoints).toEqual([
        { playerId: 102, points: 1, placement: 1 },
        { playerId: 101, points: 1, placement: 2 },
      ]);
    });

    it('leaves the tie unresolved while a hand-scored attempt states nothing', () => {
      const first = player(101);
      const second = player(102);
      const tied = match(
        [entrant(1, first.id), entrant(2, second.id)],
        [handScoredRound([standing(200, first, undefined, 1), standing(201, second, undefined, 1)])],
        null,
        [advancementRule(1, 30), advancementRule(2, 40)],
      );
      tied.addTiebreak(null, [first, second]).id = 50;

      expect(tied.resultState.status).toBe('tiebreak_required');
      expect(() => tied.commit()).toThrow(BadRequestException);
    });

    it('settles a hand-scored attempt as soon as one point is stated', () => {
      const first = player(101);
      const second = player(102);
      const tied = match(
        [entrant(1, first.id), entrant(2, second.id)],
        [handScoredRound([standing(200, first, undefined, 1), standing(201, second, undefined, 1)])],
        null,
        [advancementRule(1, 30), advancementRule(2, 40)],
      );
      tied.addTiebreak(null, [first, second]).id = 50;
      tied.upsertTiebreakPoints(50, second.id, 1);

      expect(tied.resultState.status).toBe('ready');

      tied.commit();

      expect(tied.entity.matchResult.playerPoints).toEqual([
        { playerId: 102, points: 1, placement: 1 },
        { playerId: 101, points: 1, placement: 2 },
      ]);
    });

    it('refuses a second attempt while a hand-scored one is still empty', () => {
      const first = player(101);
      const second = player(102);
      const tied = match(
        [entrant(1, first.id), entrant(2, second.id)],
        [handScoredRound([standing(200, first, undefined, 1), standing(201, second, undefined, 1)])],
        null,
        [advancementRule(1, 30), advancementRule(2, 40)],
      );
      tied.addTiebreak(null, [first, second]).id = 50;

      expect(() => tied.addTiebreak(null, [first, second])).toThrow(BadRequestException);
    });

    it('invalidates tiebreak evidence when ordinary scoring changes', () => {
      const first = player(101);
      const second = player(102);
      const tied = match(
        [entrant(1, first.id), entrant(2, second.id)],
        [handScoredRound([standing(200, first, undefined, 1), standing(201, second, undefined, 1)])],
        null,
        [advancementRule(1, 30), advancementRule(2, 40)],
      );
      const tiebreak = tied.addTiebreak(null, [first, second]);

      tied.upsertPoints(HAND_SCORED_ROUND_ID, first, 2);

      expect(tiebreak.invalidated).toBe(true);
    });

    it('keeps the same result row when a completed match is committed again', () => {
      const existing = { id: 5, playerPoints: [{ playerId: 101, points: 1 }] } as MatchResult;
      const recommitted = match([entrant(1, 101)], [handScoredRound([standing(200, player(101), undefined, 2)])], existing);

      recommitted.commit();

      expect(recommitted.entity.matchResult).toBe(existing);
      expect(existing.playerPoints).toEqual([{ playerId: 101, points: 2, placement: 1 }]);
      expect(recommitted.removals.matchResultId).toBeNull();
    });

    it('drops the result row and deactivates the match when it is reopened', () => {
      const reopened = match([entrant(1, 101)], [handScoredRound()], { id: 5, playerPoints: [] } as MatchResult);
      reopened.entity.active = true;

      reopened.reopen();

      expect(reopened.isCompleted).toBe(false);
      expect(reopened.entity.active).toBe(false);
      expect(reopened.removals.matchResultId).toBe(5);
    });

    it('orders the entrants by the points the result gave them', () => {
      const runnerUp = entrant(2, 102);
      const winner = entrant(1, 101);
      const completed = match([runnerUp, winner], [], {
        id: 5,
        playerPoints: [
          { playerId: 101, points: 3 },
          { playerId: 102, points: 1 },
        ],
      } as MatchResult);

      expect(completed.entrantsByPlacement().map((each) => each.id)).toEqual([winner.id, runnerUp.id]);
    });
  });

  describe('entrants', () => {
    it('puts an entrant in the slot it was given, moving the ones behind it', () => {
      const first = entrant(1, 101);
      const second = entrant(2, 102);
      const filled = match([first, second], []);

      filled.placeEntrant(entrant(3, 103), 2, scoringSystems(jest.fn()));

      expect(filled.entrants.map((each) => each.id)).toEqual([1, 3, 2]);
    });

    it('moves an entrant that is already in the match rather than repeating it', () => {
      const first = entrant(1, 101);
      const second = entrant(2, 102);
      const filled = match([first, second], []);

      filled.placeEntrant(second, 1, scoringSystems(jest.fn()));

      expect(filled.entrants.map((each) => each.id)).toEqual([2, 1]);
    });

    describe('when the field changes', () => {
      it('takes the standings of whoever left, and records them as removed', () => {
        const staying = entrant(1, 101);
        const leaving = entrant(2, 102);
        const round = playedRound([
          standing(1, player(101), score(1, player(101), 99), 2),
          standing(2, player(102), score(2, player(102), 98), 1),
        ]);
        const scored = match([staying, leaving], [round]);

        scored.removeEntrant(leaving.id, scoringSystems(jest.fn()));

        expect(round.standings.map((each) => each.id)).toEqual([1]);
        expect(scored.removals.standingIds).toEqual([2]);
      });

      it('ranks a round again once it is complete without the entrant that left', () => {
        const recalc = jest.fn();
        const round = playedRound([
          standing(1, player(101), score(1, player(101), 99), 2),
          standing(2, player(102), score(2, player(102), 98), 1),
        ]);
        const scored = match([entrant(1, 101), entrant(2, 102), entrant(3, 103)], [round]);

        scored.removeEntrant(3, scoringSystems(recalc));

        expect(recalc).toHaveBeenCalledTimes(1);
        expect(recalc.mock.calls[0][0].map((each: Standing) => each.id)).toEqual([1, 2]);
      });

      it('sets the points back to zero when somebody joins a round that was complete', () => {
        const round = playedRound([
          standing(1, player(101), score(1, player(101), 99), 2),
          standing(2, player(102), score(2, player(102), 98), 1),
        ]);
        const scored = match([entrant(1, 101), entrant(2, 102)], [round]);

        scored.addEntrant(entrant(3, 103), scoringSystems(jest.fn()));

        expect(round.standings.map((each) => each.points)).toEqual([0, 0]);
      });

      it('leaves the stated points of a hand-scored round alone', () => {
        const round = handScoredRound([
          standing(1, player(101), undefined, 3),
          standing(2, player(102), undefined, 1),
        ]);
        const stated = match([entrant(1, 101), entrant(2, 102)], [round]);

        stated.addEntrant(entrant(3, 103), scoringSystems(jest.fn()));

        expect(round.standings.map((each) => each.points)).toEqual([3, 1]);
      });

      it('still takes the standing of somebody who leaves a hand-scored round', () => {
        const round = handScoredRound([
          standing(1, player(101), undefined, 3),
          standing(2, player(102), undefined, 1),
        ]);
        const stated = match([entrant(1, 101), entrant(2, 102)], [round]);

        stated.removeEntrant(2, scoringSystems(jest.fn()));

        expect(round.standings.map((each) => each.id)).toEqual([1]);
      });
    });

    it('answers whether adding or removing an entrant changed anything', () => {
      const first = entrant(1, 101);
      const filled = match([first], []);

      expect(filled.addEntrant(first, scoringSystems(jest.fn()))).toBe(false);
      expect(filled.addEntrant(entrant(2, 102), scoringSystems(jest.fn()))).toBe(true);
      expect(filled.removeEntrant(1, scoringSystems(jest.fn()))).toBe(true);
      expect(filled.removeEntrant(1, scoringSystems(jest.fn()))).toBe(false);
    });
  });
});
