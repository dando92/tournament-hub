import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDifficulty } from '../../src/features/song/model/songImport/difficulty.ts';
import {
  buildImportRows,
  parseSm,
  parseSsc,
  parseStepmaniaTags,
  selectCharts,
  toSongPath,
} from '../../src/features/song/model/songImport/stepmaniaParser.ts';
import type { ParsedChart, ScannedSong } from '../../src/features/song/model/songImport/types.ts';

const SSC = `
#TITLE:Anthem;
#ARTIST:Some Composer;
#MUSIC:anthem.ogg;

#NOTEDATA:;
#STEPSTYPE:dance-single;
#DIFFICULTY:Challenge;
#METER:13;
#NOTES:
0000
;

#NOTEDATA:;
#STEPSTYPE:dance-single;
#DIFFICULTY:Beginner;
#METER:3;
#NOTES:
0000
;

#NOTEDATA:;
#STEPSTYPE:dance-double;
#DIFFICULTY:Hard;
#METER:15;
#NOTES:
0000
;
`;

const SM = `
#TITLE:Older Anthem;
#ARTIST:Another Composer;

#NOTES:
     dance-single:
     :
     Hard:
     9:
     0.1,0.2,0.3,0.4,0.5:
0000
;

#NOTES:
     dance-single:
     :
     Challenge:
     12:
     0.1,0.2,0.3,0.4,0.5:
0000
;
`;

test('a tag ends at the first unescaped semicolon', () => {
  const tags = parseStepmaniaTags('#TITLE:One\\;Two;#ARTIST:Someone;');

  assert.deepEqual(tags, [
    { name: 'TITLE', value: 'One\\;Two' },
    { name: 'ARTIST', value: 'Someone' },
  ]);
});

test('an ssc gives up its artist, its charts, their meters and their difficulties', () => {
  const parsed = parseSsc(SSC);

  assert.equal(parsed.artist, 'Some Composer');
  assert.deepEqual(parsed.charts, [
    { stepstype: 'dance-single', difficulty: 'Expert', meter: 13 },
    { stepstype: 'dance-single', difficulty: 'Novice', meter: 3 },
    { stepstype: 'dance-double', difficulty: 'Hard', meter: 15 },
  ]);
});

test('an sm reads the step type, the difficulty and the meter out of the notes header', () => {
  const parsed = parseSm(SM);

  assert.equal(parsed.artist, 'Another Composer');
  assert.deepEqual(parsed.charts, [
    { stepstype: 'dance-single', difficulty: 'Hard', meter: 9 },
    { stepstype: 'dance-single', difficulty: 'Expert', meter: 12 },
  ]);
});

test('the two StepMania names that differ from the cabinet are translated, and nothing else is guessed', () => {
  assert.equal(normalizeDifficulty('Beginner'), 'Novice');
  assert.equal(normalizeDifficulty('easy'), 'Easy');
  assert.equal(normalizeDifficulty('MEDIUM'), 'Medium');
  assert.equal(normalizeDifficulty(' Hard '), 'Hard');
  assert.equal(normalizeDifficulty('Challenge'), 'Expert');
  assert.equal(normalizeDifficulty('Edit'), 'Edit');
  assert.equal(normalizeDifficulty('Ultra'), null);
  assert.equal(normalizeDifficulty(''), null);
});

test('all takes every dance-single chart, in order of meter', () => {
  const charts = selectCharts(parseSsc(SSC).charts, 'all');

  assert.deepEqual(
    charts.map((chart) => chart.meter),
    [3, 13],
  );
});

test('highest means the highest meter, not the highest difficulty', () => {
  const charts: ParsedChart[] = [
    { stepstype: 'dance-single', difficulty: 'Expert', meter: 9 },
    { stepstype: 'dance-single', difficulty: 'Hard', meter: 14 },
  ];

  assert.deepEqual(selectCharts(charts, 'highest'), [
    { stepstype: 'dance-single', difficulty: 'Hard', meter: 14 },
  ]);
});

test('a chart of another step type is not imported', () => {
  const charts: ParsedChart[] = [{ stepstype: 'dance-double', difficulty: 'Hard', meter: 15 }];

  assert.deepEqual(selectCharts(charts, 'all'), []);
});

test('a song path is the pack and the folder, with no Songs prefix', () => {
  assert.equal(toSongPath('Pack A', 'Song 1'), 'Pack A/Song 1');
});

function song(overrides: Partial<ScannedSong> = {}): ScannedSong {
  return {
    pack: 'Pack A',
    folder: 'Song 1',
    songPath: 'Pack A/Song 1',
    artist: 'Some Composer',
    charts: [],
    ...overrides,
  };
}

test('one chart is one row, carrying both the meter and the difficulty it was written for', () => {
  const { rows } = buildImportRows([song({ charts: parseSsc(SSC).charts })], 'all');

  assert.deepEqual(rows, [
    {
      title: 'Pack A/Song 1',
      artist: 'Some Composer',
      group: 'Pack A',
      difficulty: 3,
      chartDifficulty: 'Novice',
    },
    {
      title: 'Pack A/Song 1',
      artist: 'Some Composer',
      group: 'Pack A',
      difficulty: 13,
      chartDifficulty: 'Expert',
    },
  ]);
});

test('a chart with no meter is left out, and one with an unknown difficulty is left out and reported', () => {
  const { rows, warnings } = buildImportRows(
    [
      song({
        charts: [
          { stepstype: 'dance-single', difficulty: 'Hard', meter: Number.NaN },
          { stepstype: 'dance-single', difficulty: null, meter: 11 },
          { stepstype: 'dance-single', difficulty: 'Expert', meter: 12 },
        ],
      }),
    ],
    'all',
  );

  assert.deepEqual(
    rows.map((row) => row.difficulty),
    [12],
  );
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Pack A\/Song 1/);
});

test('the same path, pack and meter is one chart, and the rows are ordered by pack, path and meter', () => {
  const { rows } = buildImportRows(
    [
      song({
        pack: 'Pack B',
        songPath: 'Pack B/Song 9',
        charts: [{ stepstype: 'dance-single', difficulty: 'Expert', meter: 12 }],
      }),
      song({
        charts: [
          { stepstype: 'dance-single', difficulty: 'Hard', meter: 8 },
          { stepstype: 'dance-single', difficulty: 'Expert', meter: 8 },
        ],
      }),
    ],
    'all',
  );

  assert.deepEqual(
    rows.map((row) => [row.group, row.title, row.difficulty]),
    [
      ['Pack A', 'Pack A/Song 1', 8],
      ['Pack B', 'Pack B/Song 9', 12],
    ],
  );
});
