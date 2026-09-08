import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_PAGE_NOTICES, withNotice, withoutNotice, type PageNotice } from '../../src/shared/lib/pageNotices.ts';

function failure(message: string): Omit<PageNotice, 'count'> {
    return { tone: 'failure', message };
}

test('counts a repeated failure up instead of stacking it', () => {
    const once = withNotice([], failure('Could not commit WR2 M1.'));
    const twice = withNotice(once, failure('Could not commit WR2 M1.'));

    assert.equal(twice.length, 1);
    assert.equal(twice[0].count, 2);
});

test('stacks different failures newest first and drops the oldest beyond the cap', () => {
    const notices = ['first', 'second', 'third', 'fourth'].reduce(
        (current, message) => withNotice(current, failure(message)),
        [] as PageNotice[],
    );

    assert.equal(notices.length, MAX_PAGE_NOTICES);
    assert.deepEqual(notices.map((notice) => notice.message), ['fourth', 'third', 'second']);
});

test('takes a notice back by the sentence that raised it', () => {
    const notices = withNotice(withNotice([], failure('first')), failure('second'));

    assert.deepEqual(withoutNotice(notices, 'first').map((notice) => notice.message), ['second']);
});
