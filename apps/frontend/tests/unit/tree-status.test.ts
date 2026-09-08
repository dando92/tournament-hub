import assert from 'node:assert/strict';
import test from 'node:test';
import {
  divisionStatus,
  phaseStatus,
  poolStatus,
  rollUpStatus,
  tournamentStatus,
} from '../../src/features/tournament/model/treeStatus.ts';

function pool(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Pool A',
    displayIdentifier: 'A',
    bracketType: null,
    state: 'active',
    entrants: [],
    matchCount: 2,
    progressedMatchCount: 0,
    pendingMatchCount: 0,
    ...overrides,
  } as never;
}

test('a pool with a match waiting on a person reports pending', () => {
  assert.equal(poolStatus(pool({ pendingMatchCount: 1 })), 'pending');
  assert.equal(poolStatus(pool()), 'idle');
  assert.equal(poolStatus(pool({ progressedMatchCount: 1 })), 'running');
  assert.equal(poolStatus(pool({ state: 'completed' })), 'done');
  assert.equal(poolStatus(pool({ matchCount: 0, state: 'pending' })), 'idle');
});

test('pending outranks running on the way up', () => {
  assert.equal(rollUpStatus(['running', 'pending']), 'pending');
  assert.equal(rollUpStatus(['idle', 'running']), 'running');
  assert.equal(rollUpStatus(['idle', 'done']), 'running');
  assert.equal(rollUpStatus(['done', 'done']), 'done');
  assert.equal(rollUpStatus([]), 'idle');
});

test('a waiting pool colours every branch above it', () => {
  const phase = {
    id: 1,
    name: 'Phase 1',
    matchCount: 4,
    phaseGroups: [pool({ id: 1 }), pool({ id: 2, pendingMatchCount: 1 })],
  } as never;
  const division = { id: 1, name: 'Division1', entrants: [], phases: [phase] } as never;

  assert.equal(phaseStatus(phase), 'pending');
  assert.equal(divisionStatus(division), 'pending');
  assert.equal(tournamentStatus([division]), 'pending');
});

test('a tournament whose structure is not loaded reports nothing', () => {
  assert.equal(tournamentStatus([]), undefined);
});
