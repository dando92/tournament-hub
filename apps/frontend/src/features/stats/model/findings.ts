import type { DivisionPlacementRowDto, DivisionPlacementsDto, PlayerStatsRowDto, SongStatsRowDto } from "@tournament-hub/contracts";

import { seedSwing } from "@/features/stats/model/statsFormat";

const ENOUGH_RUNS = 4;

export type BiggestUpset = {
  row: DivisionPlacementRowDto;
  divisionName: string;
  swing: number;
};

export type StatsFindings = {
  bestRun: PlayerStatsRowDto | null;
  mostConsistent: PlayerStatsRowDto | null;
  hardestSong: SongStatsRowDto | null;
  biggestUpset: BiggestUpset | null;
};

export function findingsOf(players: PlayerStatsRowDto[], songs: SongStatsRowDto[], divisions: DivisionPlacementsDto[]): StatsFindings {
  return {
    bestRun: best(players.filter((player) => player.bestPercentage !== null), (player) => player.bestPercentage ?? 0),
    mostConsistent: best(
      players.filter((player) => player.percentageSpread !== null && clearedRuns(player) >= ENOUGH_RUNS),
      (player) => -(player.percentageSpread ?? 0),
    ),
    hardestSong: best(
      songs.filter((song) => song.playedCount >= ENOUGH_RUNS && song.failedCount > 0),
      (song) => song.failedCount / song.playedCount,
    ),
    biggestUpset: biggestUpset(divisions),
  };
}

function clearedRuns(player: PlayerStatsRowDto): number {
  return player.songsPlayed - player.failedCount;
}

function best<T>(candidates: T[], score: (candidate: T) => number): T | null {
  return candidates.reduce<T | null>((held, candidate) => (held === null || score(candidate) > score(held) ? candidate : held), null);
}

function biggestUpset(divisions: DivisionPlacementsDto[]): BiggestUpset | null {
  const candidates = divisions
    .filter((division) => division.complete)
    .flatMap((division) =>
      division.rows.map((row) => ({ row, divisionName: division.divisionName, swing: seedSwing(row) ?? 0 })),
    )
    .filter((candidate) => candidate.swing > 0);

  return best(candidates, (candidate) => candidate.swing);
}
