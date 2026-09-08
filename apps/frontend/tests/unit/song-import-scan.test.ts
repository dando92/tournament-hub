import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DirectoryLikeHandle,
  EntryHandle,
  FileLikeHandle,
} from '../../src/features/song/model/songImport/filesystem.ts';
import {
  findPreferredNoteFile,
  resolvePacks,
  scanSongsDirectory,
} from '../../src/features/song/model/songImport/scan.ts';

function file(name: string, text = ''): FileLikeHandle {
  return { kind: 'file', name, getFile: async () => ({ text: async () => text }) };
}

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

const SSC = `#ARTIST:Composer One;
#NOTEDATA:;
#STEPSTYPE:dance-single;
#DIFFICULTY:Challenge;
#METER:13;
`;

const SM = `#ARTIST:Composer Two;
#NOTES:
     dance-single:
     :
     Hard:
     9:
     0,0,0,0,0:
0000
;
`;

function songFolder(name: string, files: FileLikeHandle[]): DirectoryLikeHandle {
  return directory(name, files);
}

test('a folder whose children hold simfiles is itself the pack', async () => {
  const pack = directory('Pack A', [
    songFolder('Song 1', [file('song.ssc', SSC)]),
    songFolder('Song 2', [file('song.sm', SM)]),
  ]);

  const packs = await resolvePacks(pack);

  assert.deepEqual(
    packs.map((entry) => entry.name),
    ['Pack A'],
  );
});

test('a Songs folder is its packs', async () => {
  const root = directory('Songs', [
    directory('Pack B', [songFolder('Song 3', [file('song.ssc', SSC)])]),
    directory('Pack A', [songFolder('Song 1', [file('song.ssc', SSC)])]),
  ]);

  const packs = await resolvePacks(root);

  assert.deepEqual(
    packs.map((entry) => entry.name),
    ['Pack A', 'Pack B'],
  );
});

test('an ssc is preferred over an sm in the same song folder', async () => {
  const folder = songFolder('Song 1', [file('song.sm', SM), file('song.ssc', SSC)]);

  const noteFile = await findPreferredNoteFile(folder);

  assert.equal(noteFile?.name, 'song.ssc');
});

test('a folder with no simfile is not a song folder', async () => {
  const folder = songFolder('Not A Song', [file('banner.png'), file('readme.txt')]);

  assert.equal(await findPreferredNoteFile(folder), null);
});

test('hidden folders and folders without simfiles are ignored, and every song is read once', async () => {
  const root = directory('Songs', [
    directory('.git', [songFolder('Song X', [file('song.ssc', SSC)])]),
    directory('Pack A', [
      songFolder('Song 1', [file('song.ssc', SSC)]),
      songFolder('Song 2', [file('song.sm', SM)]),
      directory('.cache', [file('song.ssc', SSC)]),
      directory('Artwork', [file('banner.png')]),
    ]),
    file('pack-list.txt'),
  ]);

  const scan = await scanSongsDirectory(root);

  assert.equal(scan.rootName, 'Songs');
  assert.deepEqual(scan.packs, ['Pack A']);
  assert.deepEqual(
    scan.songs.map((song) => song.songPath),
    ['Pack A/Song 1', 'Pack A/Song 2'],
  );
  assert.deepEqual(
    scan.songs.map((song) => song.artist),
    ['Composer One', 'Composer Two'],
  );
  assert.deepEqual(scan.warnings, []);
});

test('a simfile that cannot be read costs one song, not the import', async () => {
  const unreadable: FileLikeHandle = {
    kind: 'file',
    name: 'song.ssc',
    getFile: async () => {
      throw new Error('NotFoundError');
    },
  };
  const root = directory('Pack A', [
    songFolder('Broken', [unreadable]),
    songFolder('Song 1', [file('song.ssc', SSC)]),
  ]);

  const scan = await scanSongsDirectory(root);

  assert.deepEqual(
    scan.songs.map((song) => song.songPath),
    ['Pack A/Song 1'],
  );
  assert.equal(scan.warnings.length, 1);
  assert.match(scan.warnings[0], /Pack A\/Broken/);
});
