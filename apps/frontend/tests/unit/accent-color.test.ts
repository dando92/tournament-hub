import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ACCENT_PRESETS,
    DEFAULT_ACCENT_COLOR,
    accentChannels,
    accentContrastChannels,
    applyAccentColor,
    normalizeAccentColor,
    readAccentColor,
    writeAccentColor,
} from '../../src/shared/lib/accentColor.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
};

const properties = new Map<string, string>();
(globalThis as unknown as { document: unknown }).document = {
    documentElement: {
        style: {
            setProperty: (name: string, value: string) => void properties.set(name, value),
            removeProperty: (name: string) => void properties.delete(name),
        },
    },
};

test('a device that never chose an accent gets the default one', () => {
    store.clear();

    assert.equal(readAccentColor(), DEFAULT_ACCENT_COLOR);
});

test('a chosen accent is remembered, and the default stops being stored', () => {
    store.clear();
    writeAccentColor('#8A6FA6');

    assert.equal(readAccentColor(), '#8A6FA6');

    writeAccentColor(DEFAULT_ACCENT_COLOR);

    assert.equal(store.size, 0);
    assert.equal(readAccentColor(), DEFAULT_ACCENT_COLOR);
});

test('a stored value that is not a colour is read as the default', () => {
    store.clear();
    store.set('accent_color', 'rebeccapurple');

    assert.equal(readAccentColor(), DEFAULT_ACCENT_COLOR);
});

test('a colour is normalised to one shape, and anything else is refused', () => {
    assert.equal(normalizeAccentColor('  #5f858e '), '#5F858E');
    assert.equal(normalizeAccentColor('#5F8'), null);
    assert.equal(normalizeAccentColor('#5F858EFF'), null);
    assert.equal(normalizeAccentColor(0x5f858e), null);
});

test('the channels are the ones the custom property wants', () => {
    assert.equal(accentChannels(DEFAULT_ACCENT_COLOR), '95 133 142');
    assert.equal(accentChannels('#000000'), '0 0 0');
});

test('a glyph on the accent takes the side of it that can be read', () => {
    for (const preset of ACCENT_PRESETS) {
        assert.equal(accentContrastChannels(preset.value), '255 255 255', preset.name);
    }
    assert.equal(accentContrastChannels('#FFE066'), '0 0 0');
    assert.equal(accentContrastChannels('#FFFFFF'), '0 0 0');
});

test('the default accent leaves the document alone, and a chosen one paints it', () => {
    properties.clear();
    applyAccentColor('#FFE066');

    assert.equal(properties.get('--ui-accent'), '255 224 102');
    assert.equal(properties.get('--ui-accent-contrast'), '0 0 0');

    applyAccentColor(DEFAULT_ACCENT_COLOR);

    assert.equal(properties.size, 0);
});
