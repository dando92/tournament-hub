import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DirectoryPickerUnsupportedError,
  pickSongsDirectory,
  supportsDirectoryPicker,
} from '../../src/features/song/model/songImport/filesystem.ts';
import type { DirectoryLikeHandle, EntryHandle } from '../../src/features/song/model/songImport/filesystem.ts';
import { scanSongsDirectory } from '../../src/features/song/model/songImport/scan.ts';
import { buildImportRows } from '../../src/features/song/model/songImport/stepmaniaParser.ts';

function directory(name: string, entries: EntryHandle[]): DirectoryLikeHandle {
  return {
    kind: 'directory',
    name,
    values: () => ({
      async *[Symbol.asyncIterator]() {
        for (const entry of entries) yield entry;
      },
    }),
  };
}

function simfile(name: string, text: string): EntryHandle {
  return { kind: 'file', name, getFile: async () => ({ text: async () => text }) };
}

const SSC = `#ARTIST:Composer One;
#NOTEDATA:;
#STEPSTYPE:dance-single;
#DIFFICULTY:Hard;
#METER:9;
#NOTEDATA:;
#STEPSTYPE:dance-single;
#DIFFICULTY:Challenge;
#METER:13;
`;

const PACK = directory('Pack A', [directory('Song 1', [simfile('song.ssc', SSC)])]);

function withWindow(picker: unknown, body: () => Promise<void>): Promise<void> {
  const globals = globalThis as { window?: unknown };
  const previous = globals.window;
  globals.window = picker === undefined ? {} : { showDirectoryPicker: picker };

  return body().finally(() => {
    globals.window = previous;
  });
}

test('a browser without a directory picker says so instead of failing silently', async () => {
  await withWindow(undefined, async () => {
    assert.equal(supportsDirectoryPicker(), false);
    await assert.rejects(pickSongsDirectory(), DirectoryPickerUnsupportedError);
  });
});

test('closing the picker answers with nothing, so no import follows', async () => {
  await withWindow(
    () => Promise.reject(new DOMException('The user aborted a request.', 'AbortError')),
    async () => {
      assert.equal(await pickSongsDirectory(), null);
    },
  );
});

test('a picked folder is read once and becomes the payload the API is sent', async () => {
  await withWindow(() => Promise.resolve(PACK), async () => {
    const directoryHandle = await pickSongsDirectory();
    assert.ok(directoryHandle);

    const scan = await scanSongsDirectory(directoryHandle);
    assert.deepEqual(scan.packs, ['Pack A']);
    assert.equal(scan.songs.length, 1);

    assert.deepEqual(
      buildImportRows(scan.songs, 'all').rows.map((row) => row.difficulty),
      [9, 13],
    );
    assert.deepEqual(buildImportRows(scan.songs, 'highest').rows, [
      {
        title: 'Pack A/Song 1',
        artist: 'Composer One',
        group: 'Pack A',
        difficulty: 13,
        chartDifficulty: 'Expert',
      },
    ]);
  });
});

test('a folder holding no simfile ends the flow before anything can be imported', async () => {
  const empty = directory('Downloads', [directory('Screenshots', [simfile('shot.png', '')])]);

  const scan = await scanSongsDirectory(empty);

  assert.deepEqual(scan.songs, []);
  assert.deepEqual(buildImportRows(scan.songs, 'all').rows, []);
});

test('the scan reports its progress while it reads', async () => {
  const progress: number[] = [];

  await scanSongsDirectory(PACK, (update) => progress.push(update.songs));

  assert.ok(progress.length > 0);
  assert.equal(progress[progress.length - 1], 1);
});
