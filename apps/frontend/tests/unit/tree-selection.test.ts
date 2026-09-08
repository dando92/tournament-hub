import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTreeSelection } from '../../src/features/tournament/model/treeSelection.ts';
import { apiUrl, realtimeUrl } from '../../src/shared/runtime-config.ts';

test('reads a tournament destination from the path', () => {
  assert.deepEqual(parseTreeSelection('/tournament/7/participants'), {
    tournamentId: 7,
    page: 'participants',
    divisionId: null,
    divisionPage: null,
    phaseId: null,
    poolId: null,
  });
});

test('reads a branch at every depth the tree can select', () => {
  const division = parseTreeSelection('/tournament/7/division/3');
  assert.equal(division?.divisionId, 3);
  assert.equal(division?.phaseId, null);

  const phase = parseTreeSelection('/tournament/7/division/3/phase/9');
  assert.equal(phase?.phaseId, 9);
  assert.equal(phase?.poolId, null);

  const pool = parseTreeSelection('/tournament/7/division/3/phase/9/pool/12');
  assert.equal(pool?.poolId, 12);
  assert.equal(pool?.page, null);
});

test('keeps division destinations apart from branches', () => {
  const seeding = parseTreeSelection('/tournament/7/division/3/seeding');
  assert.equal(seeding?.divisionPage, 'seeding');
  assert.equal(seeding?.phaseId, null);
});

test('ignores paths that are not inside a tournament', () => {
  assert.equal(parseTreeSelection('/account'), null);
  assert.equal(parseTreeSelection('/browse'), null);
});

test('prefers runtime deployment configuration over build-time defaults', () => {
  globalThis.window = {
    __TOURNAMENT_HUB_CONFIG__: {
      apiUrl: 'https://api.example.test/',
      realtimeUrl: 'https://realtime.example.test/',
    },
  } as Window & typeof globalThis;

  assert.equal(apiUrl(), 'https://api.example.test/');
  assert.equal(realtimeUrl(), 'https://realtime.example.test/');
});

test('resolves gateway paths against the browser origin', () => {
  globalThis.window = {
    location: { origin: 'https://tournament.example.test' },
    __TOURNAMENT_HUB_CONFIG__: {
      apiUrl: '/api/',
      realtimeUrl: '/realtime/',
    },
  } as Window & typeof globalThis;

  assert.equal(apiUrl(), 'https://tournament.example.test/api/');
  assert.equal(realtimeUrl(), 'https://tournament.example.test/realtime/');
});
