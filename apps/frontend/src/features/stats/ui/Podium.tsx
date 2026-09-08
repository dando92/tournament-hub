import type { DivisionPlacementRowDto } from "@tournament-hub/contracts";

import { seedSwing } from "@/features/stats/model/statsFormat";
import Flag from "@/features/stats/ui/Flag";
import Medal from "@/features/stats/ui/Medal";
import ScoreWithGrade from "@/features/stats/ui/ScoreWithGrade";
import SeedSwing from "@/features/stats/ui/SeedSwing";

export default function Podium({ rows }: { rows: DivisionPlacementRowDto[] }) {
  const bands = topBands(rows);
  if (bands.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bands.map((band) => (
        <PodiumCard key={band[0].entrantId} band={band} />
      ))}
    </div>
  );
}

function topBands(rows: DivisionPlacementRowDto[]): DivisionPlacementRowDto[][] {
  const bands: DivisionPlacementRowDto[][] = [];

  for (const row of rows) {
    if (row.placement > 3) {
      break;
    }
    const last = bands.at(-1);
    if (last && last[0].placement === row.placement) {
      last.push(row);
    } else {
      bands.push([row]);
    }
  }

  return bands;
}

const TITLE: Record<number, string> = { 1: "Winner", 2: "Second", 3: "Third" };

function nameOf(row: DivisionPlacementRowDto): string {
  return row.playerName ?? row.entrantName;
}

function PodiumCard({ band }: { band: DivisionPlacementRowDto[] }) {
  const placement = band[0].placement;
  const shared = band.length > 1;

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-ui-border bg-ui-surface p-4 shadow-[0_2px_8px_0_rgb(var(--ui-shadow)/var(--ui-shadow-alpha))]">
      <span className="pointer-events-none absolute -right-4 -top-3 opacity-[0.07]" aria-hidden="true">
        <Medal placement={placement} className="h-20 w-20 sm:h-24 sm:w-24" />
      </span>
      <div className="relative flex items-center gap-2">
        <Medal placement={placement} size={20} />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ui-text-mute">
          {TITLE[placement]}
          {shared ? " — shared" : ""}
        </span>
      </div>

      {shared ? (
        <div className="relative flex flex-col gap-2">
          {band.map((row) => (
            <div key={row.entrantId} className="flex items-center gap-2.5">
              <Flag nationality={row.nationality} />
              <span className="min-w-0 truncate text-base font-bold text-ui-text">{nameOf(row)}</span>
              <span className="ml-auto shrink-0 text-sm">
                <ScoreWithGrade value={row.averagePercentage} />
              </span>
            </div>
          ))}
          <p className="text-[11px] leading-snug text-ui-text-mute">Nothing played separated them.</p>
        </div>
      ) : (
        <>
          <div className="relative flex min-w-0 items-center gap-2.5">
            <Flag nationality={band[0].nationality} />
            <span className="truncate text-2xl font-extrabold leading-tight tracking-tight text-ui-text">{nameOf(band[0])}</span>
          </div>
          <div className="relative mt-auto flex flex-wrap items-end gap-x-4 gap-y-2">
            <Figure label="Average">
              <span className="text-base">
                <ScoreWithGrade value={band[0].averagePercentage} />
              </span>
            </Figure>
            <Figure label="Reached">
              <span className="truncate text-sm font-semibold text-ui-text">{band[0].exitName}</span>
            </Figure>
            {band[0].seedNum !== null ? (
              <Figure label="Seed">
                <span className="text-base font-bold tabular-nums text-ui-text">{band[0].seedNum}</span>
                <SeedSwing swing={seedSwing(band[0])} />
              </Figure>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-ui-text-mute">{label}</span>
      <span className="flex min-w-0 items-baseline gap-1.5">{children}</span>
    </div>
  );
}
