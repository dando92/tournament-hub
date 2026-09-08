import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Match, Round } from "@/features/match/model/types";
import { matchPointsOf } from "@/features/match/model/matchPoints";
import { Player } from "@/features/participant/model/types";
import DeleteConfirmButton from "@/shared/components/ui/DeleteConfirmButton";
import { btnCreateIcon } from "@/styles/buttonStyles";

type ScoreEntry = {
  scoreId: number;
  score: number;
  percentage: number;
  isFailed: boolean;
};

type MatchRowProps = {
  match: Match;
  player: Player;
  controls: boolean;
  scoreTable: Record<string, ScoreEntry>;
  hasRoute?: boolean;
  isRouteSelected?: boolean;
  routeTargetMatchId?: number | null;
  routeTargetLabel?: string;
  canClearRouteHighlight?: boolean;
  onToggleRouteHighlight?: () => void;
  onClearRouteHighlight?: () => void;
  onOpenAddStanding: (playerId: number, roundId: number, playerName: string, songTitle: string) => void;
  onDeletePlayer?: (playerId: number) => void;
  onOpenEditStanding: (
    playerId: number,
    roundId: number,
    playerName: string,
    songTitle: string,
    scoreId: number,
    percentage: number,
    score: number,
    isFailed: boolean,
  ) => void;
  onDeleteStanding: (playerId: number, roundId: number) => void;
  onChangePoints: (playerId: number, roundId: number, points: number) => void;
  onOpenAddTiebreakStanding: (playerId: number, tiebreakId: number, playerName: string, songTitle: string) => void;
  onOpenEditTiebreakStanding: (
    playerId: number,
    tiebreakId: number,
    playerName: string,
    songTitle: string,
    scoreId: number,
    percentage: number,
    isFailed: boolean,
  ) => void;
  onChangeTiebreakPoints: (tiebreakId: number, playerId: number, points: number) => void;
};

export default function MatchRow({
  match,
  player,
  controls,
  scoreTable,
  hasRoute = false,
  isRouteSelected = false,
  routeTargetMatchId = null,
  routeTargetLabel,
  canClearRouteHighlight = false,
  onToggleRouteHighlight,
  onClearRouteHighlight,
  onOpenAddStanding,
  onDeletePlayer,
  onOpenEditStanding,
  onDeleteStanding,
  onChangePoints,
  onOpenAddTiebreakStanding,
  onOpenEditTiebreakStanding,
  onChangeTiebreakPoints,
}: MatchRowProps) {
  const totalPoints = matchPointsOf(match, player.id);
  const canToggleRoute = Boolean(match.matchResult && routeTargetMatchId && onToggleRouteHighlight);
  const canClickCompletedRow = Boolean(match.matchResult && (canToggleRoute || canClearRouteHighlight));

  function handScoredCell(round: Round) {
    const points = (round.standings ?? []).find((standing) => standing.player.id === player.id)?.points ?? 0;

    return (
      <td key={round.id} className="px-1 sm:px-3 py-2 text-center">
        {controls ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={points <= 0}
              onClick={(event) => {
                event.stopPropagation();
                onChangePoints(player.id, round.id, Math.max(0, points - 1));
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-ui-border text-ui-text-soft hover:bg-ui-selected disabled:cursor-not-allowed disabled:opacity-40"
              title="Decrease points"
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <span className="w-8 text-center font-bold text-ui-text-soft">{points}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChangePoints(player.id, round.id, points + 1);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-ui-border text-ui-text-soft hover:bg-ui-selected"
              title="Increase points"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        ) : (
          <span className="font-bold text-ui-text-soft">{points}</span>
        )}
      </td>
    );
  }

  return (
    <tr
      className={`border-t bg-ui-row transition-colors ${
        isRouteSelected
          ? "border-ui-accent bg-ui-selected"
          : "border-ui-separator"
      } ${canClickCompletedRow ? "cursor-pointer sm:hover:bg-ui-selected" : ""}`}
      onClick={() => {
        if (canToggleRoute && routeTargetMatchId) {
          onToggleRouteHighlight?.();
          return;
        }
        if (canClearRouteHighlight) onClearRouteHighlight?.();
      }}
    >
      <td className="px-2 py-2 text-center w-8">
        {controls && !match.matchResult && onDeletePlayer && (
          <DeleteConfirmButton
            onConfirm={() => onDeletePlayer(player.id)}
            title="Remove player from match"
            className="text-xs shrink-0"
            confirmMessage={`Remove "${player.playerName}" from this match?`}
            confirmText="Remove"
          />
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`font-medium truncate ${hasRoute ? "text-ui-text-soft" : "text-ui-text"}`}
              title={routeTargetLabel}
            >
              {player.playerName}
            </span>
          </div>
        </div>
      </td>

      {match.rounds.map((round) => {
        if (round.song === null) {
          return handScoredCell(round);
        }

        const song = round.song;
        const key = `${player.id}-${round.id}`;
        const scoreData = scoreTable[key];
        const playerDisabled = scoreData?.isFailed && scoreData?.percentage === -1;

        if (playerDisabled) {
          return (
            <td key={round.id} className="px-1 sm:px-3 py-2 bg-ui-selected text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-ui-text-mute italic">disabled</span>
                {controls && (
                  <button
                    onClick={() => onDeleteStanding(player.id, round.id)}
                    className="text-xs text-ui-text-soft hover:underline"
                  >
                    reactivate
                  </button>
                )}
              </div>
            </td>
          );
        }

        if (!scoreData) {
          return (
            <td key={round.id} className="px-1 sm:px-3 py-2 text-center">
              {controls ? (
                <button
                  onClick={() => onOpenAddStanding(player.id, round.id, player.playerName, song.title)}
                  title="Add score"
                  className={btnCreateIcon}
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              ) : (
                <span className="text-ui-border-strong">—</span>
              )}
            </td>
          );
        }

        return (
          <td
            key={round.id}
            className="px-1 sm:px-3 py-2 text-center"
          >
            <button
              type="button"
              disabled={!controls}
              className={`relative inline-flex flex-col items-center gap-0.5 rounded px-2 transition-colors disabled:cursor-default ${
                controls ? "cursor-pointer hover:bg-ui-raised focus:outline-none focus:ring-2 focus:ring-ui-accent/60" : ""
              }`}
              onClick={(event) => {
                if (!controls) return;
                event.stopPropagation();
                onOpenEditStanding(
                  player.id,
                  round.id,
                  player.playerName,
                  song.title,
                  scoreData.scoreId,
                  scoreData.percentage,
                  scoreData.score,
                  scoreData.isFailed,
                );
              }}
              title={controls ? "Edit or delete standing" : undefined}
            >
              <div className="flex min-h-7 items-center justify-center gap-1.5">
                <span className={`match-score-percentage font-bold text-base ${scoreData.isFailed ? "text-state-failed" : "text-ui-text"}`}>
                  {scoreData.percentage.toFixed(2)}%
                </span>
                {scoreData.isFailed && (
                  <span className="text-xs bg-state-failed/10 text-state-failed px-1 rounded font-semibold">F</span>
                )}
              </div>
              <div className="-mt-1 flex min-h-4 items-center justify-center sm:mt-0 sm:min-h-6">
                <span className="text-xs text-ui-text-mute">{scoreData.score} pts</span>
              </div>
            </button>
          </td>
        );
      })}

      {match.rounds.length > 0 && (
        <td className="px-1 sm:px-3 py-2 text-center border-l border-ui-border">
          <span className="font-bold text-ui-text-soft">{totalPoints}</span>
        </td>
      )}
      {match.tiebreaks.map((tiebreak) => {
        const standing = tiebreak.standings.find((candidate) => candidate.player.id === player.id);
        if (!standing) return <td key={tiebreak.id} className="border-l border-ui-border px-3 py-2 text-center text-ui-text-mute">—</td>;
        if (tiebreak.song) {
          if (!standing.score) {
            return (
              <td key={tiebreak.id} className="border-l border-ui-border px-3 py-2 text-center">
                {controls && !tiebreak.invalidated ? (
                  <button
                    type="button"
                    className={btnCreateIcon}
                    title="Add tiebreak score"
                    onClick={() => onOpenAddTiebreakStanding(player.id, tiebreak.id, player.playerName, tiebreak.song!.title)}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                ) : <span className="text-ui-text-mute">—</span>}
              </td>
            );
          }
          return (
            <td key={tiebreak.id} className="border-l border-ui-border bg-ui-selected/40 px-3 py-2 text-center">
              <button
                type="button"
                disabled={!controls || tiebreak.invalidated}
                className="rounded px-2 py-1 font-bold text-ui-text transition-colors enabled:hover:bg-ui-raised enabled:focus:outline-none enabled:focus:ring-2 enabled:focus:ring-ui-accent/60 disabled:cursor-default"
                title={controls && !tiebreak.invalidated ? "Edit or delete standing" : undefined}
                onClick={() => onOpenEditTiebreakStanding(
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
            </td>
          );
        }

        const points = standing.manualPoints ?? 0;
        return (
          <td key={tiebreak.id} className="border-l border-ui-border bg-ui-selected/40 px-2 py-2 text-center">
            {controls && !tiebreak.invalidated ? (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={points <= 0}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-ui-border text-ui-text-soft hover:bg-ui-selected disabled:cursor-not-allowed disabled:opacity-40"
                  title="Decrease points"
                  onClick={() => onChangeTiebreakPoints(tiebreak.id, player.id, Math.max(0, points - 1))}
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <span className="w-8 text-center font-bold text-ui-text-soft">{points}</span>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-ui-border text-ui-text-soft hover:bg-ui-selected"
                  title="Increase points"
                  onClick={() => onChangeTiebreakPoints(tiebreak.id, player.id, points + 1)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            ) : <span className="font-bold text-ui-text-soft">{points}</span>}
          </td>
        );
      })}
      {match.rounds.length > 0 && (
        <td className="border-l border-ui-border px-2 py-2 text-center font-bold text-ui-text-soft">
          {match.resultState.entries.find((entry) => entry.playerId === player.id)?.placement ?? "—"}
        </td>
      )}
    </tr>
  );
}
