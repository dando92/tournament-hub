import type { DivisionPlacementRowDto, DivisionPlacementsDto } from "@tournament-hub/contracts";

import { placementLabel, seedSwing } from "@/features/stats/model/statsFormat";
import Flag from "@/features/stats/ui/Flag";
import Medal from "@/features/stats/ui/Medal";
import RunChips from "@/features/stats/ui/RunChips";
import ScoreWithGrade from "@/features/stats/ui/ScoreWithGrade";
import SeedSwing from "@/features/stats/ui/SeedSwing";

export default function PlacementsTable({ division }: { division: DivisionPlacementsDto }) {
  if (!division.complete) {
    return (
      <p className="rounded-xl border border-ui-border bg-ui-surface px-4 py-6 text-center text-sm italic text-ui-text-mute">
        {division.divisionName} is still under way, so it has no final order yet.
      </p>
    );
  }
  if (division.rows.length === 0) {
    return (
      <p className="rounded-xl border border-ui-border bg-ui-surface px-4 py-6 text-center text-sm italic text-ui-text-mute">
        Nobody played a match in {division.divisionName}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {division.endings > 1 ? (
        <p className="text-xs text-ui-text-mute">
          This division ends in {division.endings} places, so it has no single winner. The order below is read from how far each entrant got.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-ui-border">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-ui-raised text-[10px] uppercase tracking-wide text-ui-text-mute">
            <tr>
              <th className="w-20 px-3 py-2.5 text-left font-medium">Place</th>
              <th className="px-3 py-2.5 text-left font-medium">Entrant</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium">Seed</th>
              <th className="w-44 px-3 py-2.5 text-left font-medium">Run</th>
              <th className="w-40 px-3 py-2.5 text-left font-medium">Reached</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Points</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Songs</th>
              <th className="w-40 px-3 py-2.5 text-right font-medium">Average</th>
            </tr>
          </thead>
          <tbody>
            {division.rows.map((row) => (
              <PlacementRow key={row.entrantId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlacementRow({ row }: { row: DivisionPlacementRowDto }) {
  return (
    <tr className="border-t border-ui-separator bg-ui-row">
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-1.5">
          <Medal placement={row.placement} />
          <span className="font-extrabold tabular-nums text-ui-text">{placementLabel(row)}</span>
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2.5">
          <Flag nationality={row.nationality} />
          <span className="font-bold text-ui-text">{row.playerName ?? row.entrantName}</span>
          {row.status !== "active" ? (
            <span className="rounded border border-ui-border px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-ui-text-mute">{row.status}</span>
          ) : null}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right text-ui-text-soft">
        <span className="inline-flex items-baseline gap-1.5">
          <span className="tabular-nums">{row.seedNum ?? "—"}</span>
          <SeedSwing swing={seedSwing(row)} />
        </span>
      </td>
      <td className="px-3 py-2.5">
        <RunChips run={row.run} />
      </td>
      <td className="px-3 py-2.5 text-ui-text-soft">{row.exitName}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">{row.points}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ui-text-soft">{row.songsPlayed}</td>
      <td className="px-3 py-2.5 text-right">
        <ScoreWithGrade value={row.averagePercentage} />
      </td>
    </tr>
  );
}
