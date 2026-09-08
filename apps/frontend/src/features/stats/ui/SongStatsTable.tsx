import type { SongStatsRowDto } from "@tournament-hub/contracts";

import { meterColor } from "@/features/song/model/chartDifficultyPresentation";
import { share } from "@/features/stats/model/statsFormat";
import GradeMixBar from "@/features/stats/ui/GradeMixBar";
import ScoreWithGrade from "@/features/stats/ui/ScoreWithGrade";
import PackBanner from "@/features/stats/ui/PackBanner";

export default function SongStatsTable({ rows }: { rows: SongStatsRowDto[] }) {
  const packs = groupByPack(rows);

  return (
    <div className="flex flex-col gap-3">
      {packs.map((pack) => (
        <section key={pack.name} className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface">
          <PackBanner pack={pack.name} summary={summaryOf(pack.songs)} />
          <div className="flex items-center gap-3 bg-ui-raised px-4 py-2 text-[9.5px] font-bold uppercase tracking-wide text-ui-text-mute">
            <span className="w-[26px]" />
            <span className="flex-grow">Song</span>
            <span className="w-52">Where the runs landed</span>
            <span className="w-16 text-right">Runs</span>
            <span className="w-20 text-right">Failed</span>
            <span className="w-40 text-right">Average</span>
          </div>
          {pack.songs.map((song) => (
            <div key={song.songId} className="flex items-center gap-3 border-t border-ui-separator px-4 py-2.5">
              <span className={`inline-flex h-[23px] w-[26px] shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-white ${meterColor(song.difficulty)}`}>
                {song.difficulty}
              </span>
              <span className="min-w-0 flex-grow truncate">
                <span className="text-[13.5px] font-bold text-ui-text">{song.title}</span>
                {song.artist ? <span className="ml-2 text-xs text-ui-text-mute">{song.artist}</span> : null}
              </span>
              <span className="w-52">
                <GradeMixBar grades={song.grades} label={song.title} />
              </span>
              <span className="w-16 text-right text-xs tabular-nums text-ui-text-soft">{song.playedCount}</span>
              <span className="w-20 text-right text-xs tabular-nums">
                {song.failedCount === 0 ? (
                  <span className="text-ui-text-mute">—</span>
                ) : (
                  <span className="font-bold text-score-failed">{share(song.failedCount, song.playedCount)}</span>
                )}
              </span>
              <span className="w-40 text-right text-[13.5px]">
                <ScoreWithGrade value={song.averagePercentage} />
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

type Pack = { name: string; songs: SongStatsRowDto[] };

function groupByPack(rows: SongStatsRowDto[]): Pack[] {
  const packs = new Map<string, SongStatsRowDto[]>();

  for (const row of rows) {
    const name = row.group || "Unfiled";
    packs.set(name, [...(packs.get(name) ?? []), row]);
  }

  return [...packs.entries()]
    .map(([name, songs]) => ({ name, songs: [...songs].sort((left, right) => left.difficulty - right.difficulty || left.title.localeCompare(right.title)) }))
    .sort((left, right) => runsOf(right.songs) - runsOf(left.songs) || left.name.localeCompare(right.name));
}

function runsOf(songs: SongStatsRowDto[]): number {
  return songs.reduce((total, song) => total + song.playedCount, 0);
}

function summaryOf(songs: SongStatsRowDto[]): string {
  const runs = runsOf(songs);
  const cleared = songs.flatMap((song) => (song.averagePercentage === null ? [] : [{ average: song.averagePercentage, weight: song.playedCount - song.failedCount }]));
  const weight = cleared.reduce((total, song) => total + song.weight, 0);
  const average = weight === 0 ? null : cleared.reduce((total, song) => total + song.average * song.weight, 0) / weight;

  return `${songs.length} song${songs.length === 1 ? "" : "s"} · ${runs} run${runs === 1 ? "" : "s"}${average === null ? "" : ` · ${average.toFixed(1)}% average`}`;
}
