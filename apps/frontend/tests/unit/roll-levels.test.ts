import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { formatRollLevels, parseRollLevels } from '@/features/song/model/rollLevels';

test('reads a list of levels however it is written', () => {
    assert.deepEqual(parseRollLevels('9,9,10,10'), [9, 9, 10, 10]);
    assert.deepEqual(parseRollLevels('9 9 10 10'), [9, 9, 10, 10]);
    assert.deepEqual(parseRollLevels('9-9-10-10'), [9, 9, 10, 10]);
    assert.deepEqual(parseRollLevels(' 12 '), [12]);
});

test('reads nothing out of a field with no numbers in it', () => {
    assert.deepEqual(parseRollLevels(''), []);
    assert.deepEqual(parseRollLevels(' , - '), []);
});

test('writes the levels back the way the field reads them', () => {
    assert.equal(formatRollLevels([9, 9, 10]), '9, 9, 10');
    assert.deepEqual(parseRollLevels(formatRollLevels([9, 9, 10])), [9, 9, 10]);
});
