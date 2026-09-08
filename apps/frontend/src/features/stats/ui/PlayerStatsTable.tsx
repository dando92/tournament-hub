import type { PlayerStatsRowDto } from "@tournament-hub/contracts";

import { decimal, share } from "@/features/stats/model/statsFormat";
import Flag from "@/features/stats/ui/Flag";
import GradeMixBar, { GradeMixLegend } from "@/features/stats/ui/GradeMixBar";
import ScoreWithGrade from "@/features/stats/ui/ScoreWithGrade";

export default function PlayerStatsTable({ rows }: { rows: PlayerStatsRowDto[] }) {
  return (
    <div className="flex flex-col gap-2">
      <GradeMixLegend />
      <div className="overflow-x-auto rounded-xl border border-ui-border">
        <table className="w-full min-w-[58rem] text-sm">
          <thead className="bg-ui-raised text-[10px] uppercase tracking-wide text-ui-text-mute">
            <tr>
              <th className="w-12 px-3 py-2.5 text-left font-medium">#</th>
              <th className="px-3 py-2.5 text-left font-medium">Player</th>
              <th className="w-52 px-3 py-2.5 text-left font-medium">Grade mix</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Points</th>
              <th className="w-16 px-3 py-2.5 text-right font-medium">Runs</th>
              <th className="w-40 px-3 py-2.5 text-right font-medium">Average</th>
              <th className="w-40 px-3 py-2.5 text-right font-medium">Best</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Spread</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium">Failed</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium">Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.playerId} className="border-t border-ui-separator bg-ui-row">
                <td className="px-3 py-2.5 font-extrabold tabular-nums text-ui-text">{index + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Flag nationality={row.nationality} />
                    <span className="font-bold text-ui-text">{row.playerName}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <GradeMixBar grades={row.grades} label={row.playerName} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">{row.points}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">{row.songsPlayed}</td>
                <td className="px-3 py-2.5 text-right">
                  <ScoreWithGrade value={row.averagePercentage} />
                </td>
                <td className="px-3 py-2.5 text-right" title={row.bestSongTitle ?? undefined}>
                  <ScoreWithGrade value={row.bestPercentage} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">{decimal(row.percentageSpread)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">
                  {row.failedCount}
                  <span className="ml-1 text-xs text-ui-text-mute">{share(row.failedCount, row.songsPlayed)}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">
                  {row.matchesWon} / {row.matchesPlayed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ui-text-mute">A player with no linked account has no nationality — the empty square is the absence, not a guess.</p>
    </div>
  );
}
