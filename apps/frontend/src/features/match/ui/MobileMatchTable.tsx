import { type ReactNode, useMemo, useState } from "react";

import { entrantPlayers } from "@/features/participant/model/entrant";
import { Match } from "@/features/match/model/types";
import { matchPointsOf } from "@/features/match/model/matchPoints";
import { useStandingOrder } from "@/features/match/model/useStandingOrder";
import { displaySongTitle } from "@/features/song/model/songTitle";
import BaseModal from "@/shared/components/ui/BaseModal";
import OverflowMarquee from "@/shared/components/ui/OverflowMarquee";
import { btnPrimary, btnSecondary } from "@/styles/buttonStyles";

type Props = {
  match: Match;
  controls: boolean;
  onOpenAddStanding: (playerId: number, roundId: number, playerName: string, songTitle: string) => void;
  onOpenEditStanding: (playerId: number, roundId: number, playerName: string, songTitle: string, scoreId: number, percentage: number, score: number, isFailed: boolean) => void;
  onChangePoints: (playerId: number, roundId: number, points: number) => void;
  onOpenAddTiebreakStanding: (playerId: number, tiebreakId: number, playerName: string, songTitle: string) => void;
  onOpenEditTiebreakStanding: (playerId: number, tiebreakId: number, playerName: string, songTitle: string, scoreId: number, percentage: number, isFailed: boolean) => void;
  onChangeTiebreakPoints: (tiebreakId: number, playerId: number, points: number) => void;
};

type Metric =
  | { kind: "round"; id: number; label: string }
  | { kind: "points"; id: 0; label: "Points" }
  | { kind: "tiebreak"; id: number; label: string }
  | { kind: "placement"; id: 0; label: "Place" };

type ManualEditor = {
  title: string;
  save: (value: number) => void;
};

export default function MobileMatchTable(props: Props) {
  const { match } = props;
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [manualEditor, setManualEditor] = useState<ManualEditor | null>(null);
  const [manualValue, setManualValue] = useState(0);
  const roster = useMemo(() => entrantPlayers(match.entrants), [match.entrants]);
  const players = useStandingOrder(match, roster);
  const metrics: Metric[] = [
    ...match.rounds.map((round, index): Metric => ({ kind: "round", id: round.id, label: round.song ? displaySongTitle(round.song.title) : `By hand ${index + 1}` })),
    { kind: "points", id: 0, label: "Points" },
    ...match.tiebreaks.map((tiebreak): Metric => ({
      kind: "tiebreak",
      id: tiebreak.id,
      label: `TB ${tiebreak.sequence} · ${tiebreak.song ? displaySongTitle(tiebreak.song.title) : "By hand"}`,
    })),
    { kind: "placement", id: 0, label: "Place" },
  ];

  function editManual(title: string, value: number, save: (next: number) => void) {
    setManualValue(value);
    setManualEditor({ title, save });
  }

  function metricHeader(metric: Metric) {
    return <OverflowMarquee text={metric.label} className="min-w-0 flex-1" />;
  }

  function cell(player: (typeof players)[number], metric: Metric) {
    if (metric.kind === "points") return <span className="font-semibold">{matchPointsOf(match, player.id)}</span>;
    if (metric.kind === "placement") {
      const placement = match.resultState.entries.find((entry) => entry.playerId === player.id)?.placement;
      return <span className="font-semibold text-ui-text-soft">{placement ?? "—"}</span>;
    }

    if (metric.kind === "round") {
      const round = match.rounds.find((candidate) => candidate.id === metric.id)!;
      const standing = round.standings.find((candidate) => candidate.player.id === player.id);
      if (!round.song) {
        const value = standing?.points ?? 0;
        return props.controls ? (
          <button type="button" className="min-h-11 min-w-11 font-semibold" onClick={() =>
            editManual(`${player.playerName} · By hand`, value, (next) => props.onChangePoints(player.id, round.id, next))
          }>{value}</button>
        ) : <span>{value}</span>;
      }
      if (!standing?.score) {
        return props.controls ? (
          <button type="button" className="min-h-11 min-w-11 text-ui-text-soft" onClick={() =>
            props.onOpenAddStanding(player.id, round.id, player.playerName, round.song!.title)
          }>+</button>
        ) : <span>—</span>;
      }
      return (
        <button
          type="button"
          disabled={!props.controls}
          className="min-h-11 rounded px-2 font-semibold transition-colors enabled:hover:bg-ui-raised enabled:focus:outline-none enabled:focus:ring-2 enabled:focus:ring-ui-accent/60 disabled:cursor-default"
          title={props.controls ? "Edit or delete standing" : undefined}
          onClick={() => props.onOpenEditStanding(
            player.id,
            round.id,
            player.playerName,
            round.song!.title,
            standing.score!.id,
            Number(standing.score!.percentage),
            standing.points,
            standing.score!.isFailed,
          )}
        >
          {Number(standing.score.percentage).toFixed(2)}%
        </button>
      );
    }

    const tiebreak = match.tiebreaks.find((candidate) => candidate.id === metric.id)!;
    const standing = tiebreak.standings.find((candidate) => candidate.player.id === player.id);
    if (!standing) return <span className="text-ui-text-mute">—</span>;
    if (!tiebreak.song) {
      const value = standing.manualPoints ?? 0;
      return props.controls && !tiebreak.invalidated ? (
        <button type="button" className="min-h-11 min-w-11 font-semibold" onClick={() =>
          editManual(`${player.playerName} · Tiebreak ${tiebreak.sequence}`, value, (next) =>
            props.onChangeTiebreakPoints(tiebreak.id, player.id, next))
        }>{value}</button>
      ) : <span>{value}</span>;
    }
    if (!standing.score) {
      return props.controls && !tiebreak.invalidated ? (
        <button type="button" className="min-h-11 min-w-11 text-ui-text-soft" onClick={() =>
          props.onOpenAddTiebreakStanding(player.id, tiebreak.id, player.playerName, tiebreak.song!.title)
        }>+</button>
      ) : <span>—</span>;
    }
    return (
      <button
        type="button"
        disabled={!props.controls || tiebreak.invalidated}
        className="min-h-11 rounded px-2 font-semibold transition-colors enabled:hover:bg-ui-raised enabled:focus:outline-none enabled:focus:ring-2 enabled:focus:ring-ui-accent/60 disabled:cursor-default"
        title={props.controls && !tiebreak.invalidated ? "Edit or delete standing" : undefined}
        onClick={() => props.onOpenEditTiebreakStanding(
          player.id,
          tiebreak.id,
          player.playerName,
          tiebreak.song!.title,
          standing.score!.id,
          Number(standing.score!.percentage),
          standing.score!.isFailed,
        )}
      >
        {Number(standing.score.percentage).toFixed(2)}%
      </button>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-ui-border bg-ui-row sm:hidden">
        {players.length <= 4 ? (
          <table className="w-full table-fixed border-collapse text-xs">
            <thead className="bg-ui-raised text-ui-text-mute">
              <tr>
                <th className="w-[30%] px-2 py-2 text-left">Result</th>
                {players.map((player) => (
                  <th key={player.id} className="px-1 py-2 text-center">
                    <span className="block min-w-0 truncate" title={player.playerName}>{player.playerName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={`${metric.kind}-${metric.id}`} className={`${metric.kind === "tiebreak" ? "bg-ui-selected/40" : ""} border-t border-ui-separator`}>
                  <th className="px-2 py-2 text-left font-medium">{metricHeader(metric)}</th>
                  {players.map((player) => <td key={player.id} className="px-1 py-1 text-center tabular-nums">{cell(player, metric)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-ui-raised text-ui-text-mute"><tr><th className="px-3 py-2 text-left">Player</th><th className="px-2 py-2 text-center">Pts</th><th className="px-2 py-2 text-center">Place</th></tr></thead>
            <tbody>
              {players.map((player) => (
                <FragmentRows
                  key={player.id}
                  player={player}
                  expanded={expandedPlayerId === player.id}
                  onToggle={() => setExpandedPlayerId((current) => current === player.id ? null : player.id)}
                  points={matchPointsOf(match, player.id)}
                  placement={match.resultState.entries.find((entry) => entry.playerId === player.id)?.placement ?? null}
                  metrics={metrics.filter((metric) => metric.kind !== "points" && metric.kind !== "placement")}
                  renderCell={(metric) => cell(player, metric)}
                  renderMetricHeader={metricHeader}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BaseModal
        open={manualEditor !== null}
        onClose={() => setManualEditor(null)}
        title={manualEditor?.title}
        maxWidth="max-w-sm"
        footer={(
          <div className="flex flex-1 justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setManualEditor(null)}>Cancel</button>
            <button type="button" className={btnPrimary} onClick={() => {
              manualEditor?.save(manualValue);
              setManualEditor(null);
            }}>Save</button>
          </div>
        )}
      >
        <input
          type="number"
          min="0"
          inputMode="numeric"
          className="w-full rounded border border-ui-border-strong bg-ui-surface px-3 py-3 text-base text-ui-text"
          value={manualValue}
          onChange={(event) => setManualValue(Math.max(0, Number(event.target.value) || 0))}
        />
      </BaseModal>
    </>
  );
}

function FragmentRows({
  player,
  expanded,
  onToggle,
  points,
  placement,
  metrics,
  renderCell,
  renderMetricHeader,
}: {
  player: { id: number; playerName: string };
  expanded: boolean;
  onToggle: () => void;
  points: number;
  placement: number | null;
  metrics: Metric[];
  renderCell: (metric: Metric) => ReactNode;
  renderMetricHeader: (metric: Metric) => ReactNode;
}) {
  return (
    <>
      <tr className="border-t border-ui-separator">
        <th className="px-3 py-2 text-left">
          <button type="button" className="min-h-11 w-full truncate text-left font-medium" onClick={onToggle}>{player.playerName} {expanded ? "▾" : "▸"}</button>
        </th>
        <td className="px-2 py-2 text-center font-semibold">{points}</td>
        <td className="px-2 py-2 text-center font-semibold">{placement ?? "—"}</td>
      </tr>
      {expanded && (
        <tr className="bg-ui-raised/50">
          <td colSpan={3} className="px-4 py-2">
            <table className="w-full text-xs">
              <tbody>{metrics.map((metric) => <tr key={`${metric.kind}-${metric.id}`}><th className="min-w-0 py-1 text-left font-medium">{renderMetricHeader(metric)}</th><td className="py-1 text-right">{renderCell(metric)}</td></tr>)}</tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
