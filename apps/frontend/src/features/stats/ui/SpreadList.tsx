import type { SongStatsRowDto } from "@tournament-hub/contracts";

import { meterColor } from "@/features/song/model/chartDifficultyPresentation";
import { decimal } from "@/features/stats/model/statsFormat";

export default function SpreadList({ rows }: { rows: SongStatsRowDto[] }) {
  const ranked = rows
    .filter((row): row is SongStatsRowDto & { percentageSpread: number } => row.percentageSpread !== null && row.playedCount >= 4)
    .sort((left, right) => right.percentageSpread - left.percentageSpread);

  if (ranked.length < 2) {
    return <p className="text-sm italic text-ui-text-mute">Not enough played yet to say which songs separated anybody.</p>;
  }

  const widest = ranked[0].percentageSpread;
  const top = ranked.slice(0, 3);
  const flattest = ranked[ranked.length - 1];

  return (
    <div className="flex flex-col gap-3">
      {top.map((song) => (
        <Row key={song.songId} song={song} widest={widest} />
      ))}
      <span className="h-px bg-ui-separator" />
      <Row song={flattest} widest={widest} dimmed />
      <p className="text-xs leading-snug text-ui-text-mute">
        Everybody cleared {flattest.title} within {decimal(flattest.percentageSpread)} of each other. It is a warm-up, not a decider.
      </p>
    </div>
  );
}

function Row({ song, widest, dimmed = false }: { song: SongStatsRowDto & { percentageSpread: number }; widest: number; dimmed?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${dimmed ? "opacity-70" : ""}`}>
      <span className={`inline-flex h-[23px] w-[26px] shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-white ${meterColor(song.difficulty)}`}>
        {song.difficulty}
      </span>
      <span className="min-w-0 flex-grow">
        <span className="block truncate text-[13px] font-bold text-ui-text">{song.title}</span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ui-raised">
          <span className="block h-full rounded-full bg-ui-text" style={{ width: `${Math.max(2, (song.percentageSpread / widest) * 100)}%` }} />
        </span>
      </span>
      <span className="w-9 shrink-0 text-right text-[13px] font-bold tabular-nums text-ui-text">{decimal(song.percentageSpread, 1)}</span>
    </div>
  );
}
