import assert from 'node:assert/strict';
import test from 'node:test';
import {
  implicitPool,
  nextPoolName,
  poolLabelIn,
  poolsAreVisible,
} from '../../src/features/division/model/poolVisibility.ts';
import type { PhaseGroup } from '../../src/features/division/model/types.ts';

function pool(id: number, name: string): PhaseGroup {
  return { id, name, displayIdentifier: name, matchCount: 0 } as unknown as PhaseGroup;
}

const soleP = { name: 'Qualifiers', phaseGroups: [pool(100, 'Pool')] };
const several = { name: 'Groups', phaseGroups: [pool(100, 'Pool'), pool(101, 'Pool 2')] };

test('a phase holding one pool keeps it implicit', () => {
  assert.equal(implicitPool(soleP)?.id, 100);
  assert.equal(poolsAreVisible(soleP), false);
});

test('a second pool makes both of them nodes of their own', () => {
  assert.equal(implicitPool(several), undefined);
  assert.equal(poolsAreVisible(several), true);
});

test('a phase that is still loading has nothing implicit in it', () => {
  assert.equal(implicitPool(undefined), undefined);
  assert.equal(poolsAreVisible({ name: 'Empty' }), false);
});

test('an implicit pool is read as its phase, a visible one under its own name', () => {
  assert.equal(poolLabelIn(soleP, soleP.phaseGroups[0]), 'Qualifiers');
  assert.equal(poolLabelIn(several, several.phaseGroups[1]), 'Pool 2');
});

test('the name offered for a new pool is the first number nobody holds', () => {
  assert.equal(nextPoolName(soleP), 'Pool 2');
  assert.equal(nextPoolName(several), 'Pool 3');
  assert.equal(nextPoolName({ name: 'Groups', phaseGroups: [pool(100, 'Pool'), pool(101, 'Pool 3')] }), 'Pool 4');
});
