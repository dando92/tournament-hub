import type { SongStatsRowDto } from "@tournament-hub/contracts";

import { meterFill } from "@/features/song/model/chartDifficultyPresentation";

const WIDTH = 800;
const HEIGHT = 320;
const PADDING = { left: 46, right: 16, top: 14, bottom: 34 };

type Plotted = { row: SongStatsRowDto; average: number };

export default function DifficultyScatter({ rows }: { rows: SongStatsRowDto[] }) {
  const plotted: Plotted[] = rows
    .filter((row): row is SongStatsRowDto & { averagePercentage: number } => row.averagePercentage !== null)
    .map((row) => ({ row, average: row.averagePercentage }));

  if (plotted.length < 3) {
    return <p className="text-sm italic text-ui-text-mute">Not enough cleared runs to plot yet.</p>;
  }

  const xDomain = padded(plotted.map((point) => point.row.difficulty), 1);
  const yDomain = padded(plotted.map((point) => point.average), 2);
  const x = (value: number) => PADDING.left + ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * (WIDTH - PADDING.left - PADDING.right);
  const y = (value: number) => HEIGHT - PADDING.bottom - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * (HEIGHT - PADDING.top - PADDING.bottom);

  const trend = fit(plotted);
  const outliers = trend ? mostMisrated(plotted, trend) : [];

  return (
    <div className="overflow-x-auto rounded-xl border border-ui-border bg-ui-surface p-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[26rem]" role="img" aria-label="Declared difficulty against average percentage">
        {ticks(yDomain, 5).map((value) => (
          <g key={`y-${value}`}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y(value)} y2={y(value)} className="stroke-ui-separator" strokeWidth={1} />
            <text x={PADDING.left - 8} y={y(value) + 3} textAnchor="end" fontSize={10} className="fill-ui-text-mute">
              {value}%
            </text>
          </g>
        ))}
        {ticks(xDomain, xDomain[1] - xDomain[0] > 12 ? 2 : 1).map((value) => (
          <text key={`x-${value}`} x={x(value)} y={HEIGHT - PADDING.bottom + 16} textAnchor="middle" fontSize={10} className="fill-ui-text-mute">
            {value}
          </text>
        ))}
        <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={HEIGHT - PADDING.bottom} y2={HEIGHT - PADDING.bottom} className="stroke-ui-border-strong" strokeWidth={1} />

        {trend ? (
          <line
            x1={x(xDomain[0])}
            y1={y(trend.at(xDomain[0]))}
            x2={x(xDomain[1])}
            y2={y(trend.at(xDomain[1]))}
            className="stroke-ui-border-strong"
            strokeWidth={1.4}
            strokeDasharray="5 4"
          />
        ) : null}

        {plotted.map((point) => (
          <circle key={point.row.songId} cx={x(point.row.difficulty)} cy={y(point.average)} r={5} className={meterFill(point.row.difficulty)} fillOpacity={0.85}>
            <title>{`${point.row.title} — meter ${point.row.difficulty}, ${point.average.toFixed(2)}% over ${point.row.playedCount} runs`}</title>
          </circle>
        ))}

        {outliers.map((point) => (
          <g key={`outlier-${point.row.songId}`}>
            <circle cx={x(point.row.difficulty)} cy={y(point.average)} r={11} fill="none" className="stroke-ui-text" strokeWidth={1.2} />
            <text x={x(point.row.difficulty)} y={y(point.average) - 16} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-ui-text">
              {point.row.title}
            </text>
            <text x={x(point.row.difficulty)} y={y(point.average) - 4} textAnchor="middle" fontSize={10} className="fill-ui-text-mute">
              meter {point.row.difficulty}, played like {trend ? Math.round(trend.meterFor(point.average)) : "—"}
            </text>
          </g>
        ))}
        <text x={WIDTH - PADDING.right} y={HEIGHT - 4} textAnchor="end" fontSize={10} className="fill-ui-text-mute">
          declared meter
        </text>
      </svg>
    </div>
  );
}

function padded(values: number[], margin: number): [number, number] {
  return [Math.min(...values) - margin, Math.max(...values) + margin];
}

function ticks([low, high]: [number, number], step: number): number[] {
  const first = Math.ceil(low / step) * step;
  const values: number[] = [];

  for (let value = first; value <= high; value += step) {
    values.push(Math.round(value * 100) / 100);
  }

  return values;
}

type Trend = {
  at: (difficulty: number) => number;
  meterFor: (average: number) => number;
};

function fit(points: Plotted[]): Trend | null {
  const count = points.length;
  const sumX = points.reduce((total, point) => total + point.row.difficulty, 0);
  const sumY = points.reduce((total, point) => total + point.average, 0);
  const sumXY = points.reduce((total, point) => total + point.row.difficulty * point.average, 0);
  const sumXX = points.reduce((total, point) => total + point.row.difficulty ** 2, 0);
  const denominator = count * sumXX - sumX ** 2;

  if (denominator === 0) {
    return null;
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  if (slope === 0) {
    return null;
  }

  return {
    at: (difficulty) => intercept + slope * difficulty,
    meterFor: (average) => (average - intercept) / slope,
  };
}

function mostMisrated(points: Plotted[], trend: Trend): Plotted[] {
  return [...points]
    .sort((left, right) => Math.abs(right.average - trend.at(right.row.difficulty)) - Math.abs(left.average - trend.at(left.row.difficulty)))
    .slice(0, 2);
}
