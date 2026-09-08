import type { StatsFindings } from "@/features/stats/model/findings";
import { decimal, percentage, share } from "@/features/stats/model/statsFormat";
import { meterColor } from "@/features/song/model/chartDifficultyPresentation";
import Flag from "@/features/stats/ui/Flag";
import GradeMark from "@/features/stats/ui/GradeMark";
import Medal from "@/features/stats/ui/Medal";


export default function FindingsStrip({ findings }: { findings: StatsFindings }) {
  const { bestRun, mostConsistent, hardestSong, biggestUpset } = findings;
  if (!bestRun && !mostConsistent && !hardestSong && !biggestUpset) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {bestRun ? (
        <Card label="Best run of the event" edge="border-l-score-4" tone="text-score-4">
          <Figure>
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-ui-text">{percentage(bestRun.bestPercentage)}</span>
            <GradeMark percentage={bestRun.bestPercentage} />
          </Figure>
          <Subject nationality={bestRun.nationality} name={bestRun.playerName}>
            {bestRun.bestSongTitle ? `on ${bestRun.bestSongTitle}` : ""}
          </Subject>
        </Card>
      ) : null}

      {mostConsistent ? (
        <Card label="Most consistent" edge="border-l-score-2" tone="text-score-2">
          <Figure>
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-ui-text">±{decimal(mostConsistent.percentageSpread)}</span>
            <span className="text-xs text-ui-text-mute">over {mostConsistent.songsPlayed} runs</span>
          </Figure>
          <Subject nationality={mostConsistent.nationality} name={mostConsistent.playerName}>
            averaging {percentage(mostConsistent.averagePercentage)}
          </Subject>
        </Card>
      ) : null}

      {hardestSong ? (
        <Card label="Hardest on the field" edge="border-l-score-failed" tone="text-score-failed">
          <Figure>
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-ui-text">{share(hardestSong.failedCount, hardestSong.playedCount)}</span>
            <span className="text-xs text-ui-text-mute">of runs failed</span>
          </Figure>
          <div className="flex items-center gap-2 text-xs text-ui-text-mute">
            <span className={`inline-flex h-[19px] min-w-[22px] items-center justify-center rounded px-1.5 text-[11px] font-extrabold text-white ${meterColor(hardestSong.difficulty)}`}>
              {hardestSong.difficulty}
            </span>
            <span className="truncate font-bold text-ui-text">{hardestSong.title}</span>
            <span className="shrink-0">
              {hardestSong.failedCount} of {hardestSong.playedCount}
            </span>
          </div>
        </Card>
      ) : null}

      {biggestUpset ? (
        <Card label="Biggest upset" edge="border-l-medal-gold" tone="text-medal-gold">
          <Figure>
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-ui-text">
              {biggestUpset.row.seedNum} → {biggestUpset.row.placement}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-state-done">▲{biggestUpset.swing}</span>
          </Figure>
          <Subject nationality={biggestUpset.row.nationality} name={biggestUpset.row.playerName ?? biggestUpset.row.entrantName}>
            <span className="inline-flex items-center gap-1">
              <Medal placement={biggestUpset.row.placement} size={12} />
              in {biggestUpset.divisionName}
            </span>
          </Subject>
        </Card>
      ) : null}
    </div>
  );
}

function Card({ label, edge, tone, children }: { label: string; edge: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-ui-border border-l-[3px] bg-ui-surface px-4 py-3.5 ${edge}`}>
      <span className={`text-[10px] font-bold uppercase tracking-[0.09em] ${tone}`}>{label}</span>
      {children}
    </div>
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return <div className="flex items-baseline gap-2">{children}</div>;
}

function Subject({ nationality, name, children }: { nationality: string; name: string | null; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-ui-text-mute">
      <Flag nationality={nationality} />
      <span className="truncate font-bold text-ui-text">{name ?? "—"}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
