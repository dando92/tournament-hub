import test from 'node:test';
import assert from 'node:assert/strict';

import { gradeOf } from '../../src/features/stats/model/grade.ts';

function mark(percentage: number, isFailed = false): string {
    const grade = gradeOf(percentage, isFailed);

    return grade.kind === 'stars' ? '★'.repeat(grade.stars) : `${grade.letter}${grade.sign}`;
}

test('the four star tiers start where the theme says they do', () => {
    assert.equal(mark(100), '★★★★');
    assert.equal(mark(99.99), '★★★');
    assert.equal(mark(99), '★★★');
    assert.equal(mark(98.99), '★★');
    assert.equal(mark(98), '★★');
    assert.equal(mark(97.99), '★');
    assert.equal(mark(96), '★');
});

test('the letters start where the theme says they do', () => {
    assert.equal(mark(95.99), 'S+');
    assert.equal(mark(94), 'S+');
    assert.equal(mark(93.99), 'S');
    assert.equal(mark(92), 'S');
    assert.equal(mark(91.99), 'S−');
    assert.equal(mark(89), 'S−');
    assert.equal(mark(88.99), 'A+');
    assert.equal(mark(86), 'A+');
    assert.equal(mark(83), 'A');
    assert.equal(mark(80), 'A−');
    assert.equal(mark(76), 'B+');
    assert.equal(mark(72), 'B');
    assert.equal(mark(68), 'B−');
    assert.equal(mark(64), 'C+');
    assert.equal(mark(60), 'C');
    assert.equal(mark(55), 'C−');
    assert.equal(mark(54.99), 'D');
    assert.equal(mark(0), 'D');
});

test('a failed run is an F whatever it scored', () => {
    assert.equal(mark(99.5, true), 'F');
    assert.equal(gradeOf(99.5, true).band, 'failed');
});

test('each tier is drawn in the band its colour comes from', () => {
    assert.equal(gradeOf(100).band, 'quad');
    assert.equal(gradeOf(96).band, 'star');
    assert.equal(gradeOf(89).band, 's');
    assert.equal(gradeOf(80).band, 'a');
    assert.equal(gradeOf(79).band, 'b');
});
