import assert from 'node:assert/strict';
import test from 'node:test';

import { PlacementPointsIncludingFails, PlacementPointsWithFailZero, RoundWinner } from '../../dist/index.js';

function standing(percentage, isFailed = false, points = 0) {
  return {
    points,
    score: {
      percentage,
      isFailed,
    },
  };
}

test('PlacementPointsWithFailZero awards descending points based on percentage', () => {
  const calculator = new PlacementPointsWithFailZero();

  const standings = [standing(98), standing(100), standing(99)];

  calculator.recalc(standings);

  assert.deepEqual(standings.map((entry) => entry.points), [1, 3, 2]);
});

test('PlacementPointsWithFailZero awards equal points to tied players and skips the tied placement', () => {
  const calculator = new PlacementPointsWithFailZero();
  const standings = [standing(100), standing(90), standing(100)];

  calculator.recalc(standings);

  assert.deepEqual(standings.map((entry) => entry.points), [3, 1, 3]);
});

test('PlacementPointsWithFailZero resets failed scores to zero while retaining their place in the points scale', () => {
  const calculator = new PlacementPointsWithFailZero();
  const standings = [standing(100, true, 3), standing(99), standing(98)];

  calculator.recalc(standings);

  assert.deepEqual(standings.map((entry) => entry.points), [0, 3, 2]);
});

test('PlacementPointsIncludingFails awards placement points to failed scores', () => {
    const calculator = new PlacementPointsIncludingFails();
    const standings = [standing(100, true), standing(99), standing(98, true)];

    calculator.recalc(standings);

    assert.deepEqual(standings.map((entry) => entry.points), [3, 2, 1]);
});

test('RoundWinner awards one point to the higher successful score', () => {
  const calculator = new RoundWinner();
  const standings = [standing(98), standing(99)];

  calculator.recalc(standings);

  assert.deepEqual(standings.map((entry) => [entry.score.percentage, entry.points]), [
    [99, 1],
    [98, 0],
  ]);
});

test('RoundWinner awards one point to the higher percentage even when that score failed', () => {
  const calculator = new RoundWinner();
  const standings = [standing(99, true), standing(90)];

  calculator.recalc(standings);

  assert.deepEqual(standings.map((entry) => [entry.score.percentage, entry.points]), [
    [99, 1],
    [90, 0],
  ]);
});
