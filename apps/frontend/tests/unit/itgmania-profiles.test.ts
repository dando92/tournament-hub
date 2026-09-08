import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import type { Participant, Player } from '../../src/features/participant/model/types.ts';
import {
  createItgmaniaProfilesArchive,
  itgmaniaArchiveFileName,
  playersForItgmaniaProfiles,
  sanitizeWindowsName,
} from '../../src/features/participant/model/itgmaniaProfiles.ts';

function participant(id: number, status: Participant['status'], player: Player): Participant {
  return {
    id,
    roles: ['competitor'],
    status,
    player,
  };
}

test('players are collected once from the whole tournament roster, including withdrawn participants', () => {
  const ann = { id: 1, playerName: 'Ann' };
  const bob = { id: 2, playerName: 'Bob' };
  const players = playersForItgmaniaProfiles([
    participant(1, 'registered', ann),
    participant(2, 'withdrawn', bob),
    participant(3, 'checked_in', ann),
  ]);

  assert.deepEqual(players, [ann, bob]);
});

test('the archive contains one profile per player under LocalProfiles and preserves display names', async () => {
  const archive = await createItgmaniaProfilesArchive([
    { id: 1, playerName: 'Alice/Bob' },
    { id: 2, playerName: 'Alice\\Bob' },
    { id: 3, playerName: 'CON' },
  ]);
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());

  assert.ok(zip.file('LocalProfiles/Alice_Bob/Editable.ini'));
  assert.ok(zip.file('LocalProfiles/Alice_Bob (2)/Editable.ini'));
  assert.ok(zip.file('LocalProfiles/_CON/Editable.ini'));
  assert.match(await zip.file('LocalProfiles/Alice_Bob/Editable.ini')!.async('string'), /\r\nDisplayName=Alice\/Bob\r\n/);
  assert.match(await zip.file('LocalProfiles/Alice_Bob (2)/Editable.ini')!.async('string'), /\r\nDisplayName=Alice\\Bob\r\n/);
});

test('only filesystem names are sanitized', () => {
  assert.equal(sanitizeWindowsName('Finals: 2026.', 'Tournament'), 'Finals_ 2026');
  assert.equal(itgmaniaArchiveFileName('Finals: 2026.'), 'Finals_ 2026.zip');
});

test('an empty export still contains the LocalProfiles directory', async () => {
  const archive = await createItgmaniaProfilesArchive([]);
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());

  assert.ok(zip.files['LocalProfiles/']);
});
