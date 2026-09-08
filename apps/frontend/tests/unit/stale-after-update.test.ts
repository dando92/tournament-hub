import assert from 'node:assert/strict';
import test from 'node:test';
import { staleAfterUpdate } from '../../src/features/tournament/model/staleAfterUpdate.ts';
import { matchKeys } from '../../src/features/match/api/match.keys.ts';
import { divisionKeys } from '../../src/features/division/api/division.keys.ts';
import { tournamentKeys } from '../../src/features/tournament/api/tournament.keys.ts';
import { participantKeys } from '../../src/features/participant/api/participant.keys.ts';
import { songKeys } from '../../src/features/song/api/song.keys.ts';
import { scheduleKeys } from '../../src/features/schedule/api/schedule.keys.ts';

const address = { tournamentId: 1, divisionId: 2, phaseId: 3, phaseGroupId: 4, matchId: 5 };

test('a match event stales the match itself and the lists it appears in', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'MatchUpdate', data: address }), [
    matchKeys.byId(5),
    matchKeys.byPhaseGroup(4),
    matchKeys.byDivision(2),
    ...scheduleKeys.lists(1),
  ]);
});

test('the schedule keys an event names are the lists that are read, not their prefix', () => {
  const keys = staleAfterUpdate({ event: 'MatchUpdate', data: address }).map((key) => JSON.stringify(key));

  assert.ok(keys.includes(JSON.stringify(scheduleKeys.list(1, false))));
  assert.ok(keys.includes(JSON.stringify(scheduleKeys.list(1, true))));
  assert.ok(!keys.includes(JSON.stringify(scheduleKeys.all(1))));
});

test('a pool event stales the tree and the match lists', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'PhaseGroupUpdate', data: address }), [
    tournamentKeys.overview(1),
    divisionKeys.summary(2),
    matchKeys.byPhaseGroup(4),
    matchKeys.byDivision(2),
  ]);
});

test('a division event stales its roster, which its seeding writes', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'DivisionUpdate', data: address }), [
    tournamentKeys.overview(1),
    divisionKeys.summary(2),
    divisionKeys.entrants(2),
  ]);
});

test('a phase event stales the two projections of the tree it appears in', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'PhaseUpdate', data: address }), [
    tournamentKeys.overview(1),
    divisionKeys.summary(2),
  ]);
});

test('a tournament event stales its tree, configuration, roster, and player catalogue', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'TournamentUpdate', data: address }), [
    tournamentKeys.overview(1),
    tournamentKeys.configuration(1),
    participantKeys.forTournament(1),
    participantKeys.players(),
  ]);
});

test('a warning is a message to a person, so nothing goes stale', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'UiWarning', data: { tournamentId: 1, message: 'Careful' } }), []);
});

test('a song event stales only the tournament song catalogue', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'SongsUpdate', data: address }), [
    songKeys.forTournament(1),
  ]);
});

test('a schedule event stales its schedule lists, activity counts, and editor', () => {
  assert.deepEqual(staleAfterUpdate({ event: 'ScheduleUpdate', data: { tournamentId: 1, scheduleId: 9 } }), [
    ...scheduleKeys.lists(1),
    scheduleKeys.activity(1),
    scheduleKeys.editor(9),
  ]);
});
