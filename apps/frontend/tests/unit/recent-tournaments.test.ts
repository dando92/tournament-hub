import assert from 'node:assert/strict';
import test from 'node:test';
import { groupSidebarTournaments, type SidebarTournament } from '../../src/shared/lib/recentTournaments.ts';

test('groups sidebar tournaments without duplicating pinned entries in recents', () => {
  const tournaments: SidebarTournament[] = [
    { id: 1, name: 'Pinned one', pinned: true },
    { id: 2, name: 'Recent one', pinned: false },
    { id: 3, name: 'Pinned two', pinned: true },
  ];

  const groups = groupSidebarTournaments(tournaments);

  assert.deepEqual(groups.pinned.map((tournament) => tournament.id), [1, 3]);
  assert.deepEqual(groups.recent.map((tournament) => tournament.id), [2]);
});
