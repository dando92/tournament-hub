import assert from 'node:assert/strict';
import test from 'node:test';
import { readSongDialogChoices, rememberedPack, writeSongDialogChoice } from '../../src/shared/lib/songDialogPreferences.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
};

test('a dialog with nothing remembered opens on the defaults', () => {
    store.clear();

    assert.deepEqual(readSongDialogChoices(1), { mode: 'title', titlePack: '', rollPack: '', allowPlayed: false });
});

test('choices are remembered per tournament', () => {
    store.clear();
    writeSongDialogChoice(1, 'titlePack', 'Pack A');
    writeSongDialogChoice(1, 'mode', 'roll');
    writeSongDialogChoice(2, 'titlePack', 'Pack B');

    assert.equal(readSongDialogChoices(1).titlePack, 'Pack A');
    assert.equal(readSongDialogChoices(1).mode, 'roll');
    assert.equal(readSongDialogChoices(2).titlePack, 'Pack B');
    assert.equal(readSongDialogChoices(2).mode, 'title');
});

test('a choice that is the default again stops being stored', () => {
    store.clear();
    writeSongDialogChoice(1, 'mode', 'roll');
    writeSongDialogChoice(1, 'mode', 'title');

    assert.equal(readSongDialogChoices(1).mode, 'title');
    assert.equal(store.get('song_dialog_choices'), '{}');
});

test('nothing is remembered without a tournament to key it on', () => {
    store.clear();
    writeSongDialogChoice(undefined, 'titlePack', 'Pack A');

    assert.equal(store.size, 0);
    assert.equal(readSongDialogChoices(undefined).titlePack, '');
});

test('a stored value of the wrong shape is read as the default', () => {
    store.clear();
    store.set('song_dialog_choices', JSON.stringify({ 1: { mode: 'shuffle', titlePack: 7, allowPlayed: 'yes' } }));

    assert.deepEqual(readSongDialogChoices(1), { mode: 'title', titlePack: '', rollPack: '', allowPlayed: false });
});

test('a remembered pack the catalogue no longer holds falls back', () => {
    assert.equal(rememberedPack('Pack A', ['Pack A', 'Pack B'], 'Pack B'), 'Pack A');
    assert.equal(rememberedPack('Pack C', ['Pack A', 'Pack B'], 'Pack A'), 'Pack A');
    assert.equal(rememberedPack('', ['Pack A'], 'Pack A'), 'Pack A');
});
