import { ReactNode, useEffect, useMemo, useState } from "react";
import { entrantPlayer } from "@/features/participant/model/entrant";
import { Match } from "@/features/match/model/types";
import { Player } from "@/features/participant/model/types";
import { getMatchProgress, getMatchProgressLabel, getMatchProgressStatus } from "@/features/match/model/matchStatus";
import { StatusBadge } from "@/shared/components/ui/StatusIcon";
import { ActiveIndicator } from "@/shared/components/ui/StatusDot";

type RoundRobinMatchesViewProps = {
  matches: Match[];
  renderMatchCard: (match: Match) => ReactNode;
};

type PlayerStats = {
  player: Player;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  order: number;
};

type PairCell = {
  match: Match | null;
  rowPoints: number;
  columnPoints: number;
  committed: boolean;
};

function getPairKey(leftPlayerId: number, rightPlayerId: number): string {
  return [leftPlayerId, rightPlayerId].sort((left, right) => left - right).join(":");
}

function getMatchPlayers(match: Match): Player[] {
  return (match.entrants ?? [])
    .map(entrantPlayer)
    .filter((player): player is Player => Boolean(player));
}

function getPlayerPoints(match: Match, playerId: number): number {
  return match.matchResult?.playerPoints?.find((entry) => entry.playerId === playerId)?.points ?? 0;
}

function getCellResultClass(cell: PairCell): string {
  if (!cell.committed || cell.rowPoints === cell.columnPoints) {
    return "border-ui-border bg-ui-selected text-ui-text-soft";
  }

  return cell.rowPoints > cell.columnPoints
    ? "border-state-done/30 bg-state-done/10 text-ui-text-soft"
    : "border-state-failed/30 bg-state-failed/10 text-state-failed";
}

export default function RoundRobinMatchesView({
  matches,
  renderMatchCard,
}: RoundRobinMatchesViewProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  const basePlayers = useMemo(() => {
    const playersById = new Map<number, { player: Player; order: number }>();

    matches.forEach((match) => {
      getMatchPlayers(match).forEach((player) => {
        if (!playersById.has(player.id)) {
          playersById.set(player.id, { player, order: playersById.size });
        }
      });
    });

    return Array.from(playersById.values());
  }, [matches]);

  const matchByPairKey = useMemo(() => {
    const pairs = new Map<string, Match>();

    matches.forEach((match) => {
      const players = getMatchPlayers(match);
      if (players.length !== 2) return;

      const key = getPairKey(players[0].id, players[1].id);
      if (!pairs.has(key)) {
        pairs.set(key, match);
      }
    });

    return pairs;
  }, [matches]);

  const statsByPlayerId = useMemo(() => {
    const stats = new Map<number, PlayerStats>();
    basePlayers.forEach(({ player, order }) => {
      stats.set(player.id, {
        player,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        order,
      });
    });

    matches.forEach((match) => {
      if (!match.matchResult) return;

      const players = getMatchPlayers(match);
      if (players.length !== 2) return;

      const left = players[0];
      const right = players[1];
      const leftPoints = getPlayerPoints(match, left.id);
      const rightPoints = getPlayerPoints(match, right.id);
      const leftStats = stats.get(left.id);
      const rightStats = stats.get(right.id);
      if (!leftStats || !rightStats) return;

      leftStats.pointsFor += leftPoints;
      leftStats.pointsAgainst += rightPoints;
      rightStats.pointsFor += rightPoints;
      rightStats.pointsAgainst += leftPoints;

      if (leftPoints > rightPoints) {
        leftStats.wins += 1;
        rightStats.losses += 1;
      } else if (rightPoints > leftPoints) {
        rightStats.wins += 1;
        leftStats.losses += 1;
      }
    });

    return stats;
  }, [basePlayers, matches]);

  const orderedPlayers = useMemo(
    () =>
      basePlayers
        .map(({ player }) => statsByPlayerId.get(player.id))
        .filter((stats): stats is PlayerStats => Boolean(stats))
        .sort((left, right) => right.wins - left.wins || left.order - right.order)
        .map((stats) => stats.player),
    [basePlayers, statsByPlayerId],
  );

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? null;

  useEffect(() => {
    if (!selectedMatchId) return;
    if (!matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(null);
    }
  }, [matches, selectedMatchId]);

  function getCell(rowPlayer: Player, columnPlayer: Player): PairCell {
    const match = matchByPairKey.get(getPairKey(rowPlayer.id, columnPlayer.id)) ?? null;
    if (!match) {
      return { match: null, rowPoints: 0, columnPoints: 0, committed: false };
    }

    return {
      match,
      rowPoints: getPlayerPoints(match, rowPlayer.id),
      columnPoints: getPlayerPoints(match, columnPlayer.id),
      committed: Boolean(match.matchResult),
    };
  }

  if (orderedPlayers.length === 0) {
    return <p className="text-center text-ui-text-mute text-sm py-8">No round robin players yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-ui-border bg-ui-row">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-ui-surface px-2 py-2 text-left text-xs font-semibold text-ui-text-soft sm:px-3 sm:py-3 sm:text-sm">
                <span className="sr-only">Players</span>
              </th>
              {orderedPlayers.map((player) => (
                <th key={player.id} className="min-w-[92px] px-2 py-2 text-center text-xs font-semibold text-ui-text sm:min-w-[160px] sm:px-3 sm:py-3 sm:text-sm">
                  {player.playerName}
                </th>
              ))}
              <th className="min-w-[72px] px-2 py-2 text-center text-xs font-semibold text-ui-text-soft sm:min-w-[110px] sm:px-3 sm:py-3 sm:text-sm">
                <span className="sr-only">Final results</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orderedPlayers.map((rowPlayer) => {
              const rowStats = statsByPlayerId.get(rowPlayer.id);

              return (
                <tr key={rowPlayer.id}>
                  <th className="sticky left-0 z-10 max-w-[96px] truncate bg-ui-surface px-2 py-2 text-left text-xs font-semibold text-ui-text sm:max-w-none sm:px-3 sm:py-3 sm:text-sm">
                    {rowPlayer.playerName}
                  </th>
                  {orderedPlayers.map((columnPlayer) => {
                    if (rowPlayer.id === columnPlayer.id) {
                      return (
                        <td key={columnPlayer.id} className="h-16 min-w-[92px] bg-ui-selected sm:h-24 sm:min-w-[160px]" />
                      );
                    }

                    const cell = getCell(rowPlayer, columnPlayer);
                    const isSelected = Boolean(cell.match && cell.match.id === selectedMatchId);

                    if (!cell.match) {
                      return (
                        <td key={columnPlayer.id} className="h-16 min-w-[92px] bg-ui-selected px-1.5 py-1 text-center text-[10px] font-medium leading-tight text-ui-text-mute sm:h-24 sm:min-w-[160px] sm:px-3 sm:py-2 sm:text-xs">
                          No match available
                        </td>
                      );
                    }

                    const progress = getMatchProgress(cell.match);

                    return (
                      <td key={columnPlayer.id} className="h-16 min-w-[92px] p-1 sm:h-24 sm:min-w-[160px] sm:p-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMatchId((current) => current === cell.match?.id ? null : cell.match?.id ?? null)
                          }
                          className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded border-l-[3px] border-y border-r px-1 py-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent sm:gap-2 sm:px-2 sm:py-2 ${getCellResultClass(cell)} ${
                            isSelected ? "border-ui-accent bg-ui-selected font-semibold" : "hover:border-ui-border-strong"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1">
                            <span
                              className={`inline-flex h-6 items-center gap-1.5 rounded-full border pl-2 pr-2.5 text-[11px] font-medium text-ui-text-soft ${
                                cell.match.active
                                  ? "border-state-live/35 bg-state-live/10"
                                  : "border-state-idle/35 bg-state-idle/10"
                              }`}
                            >
                              <ActiveIndicator
                                on={cell.match.active}
                                label={cell.match.active ? "Match active" : "Match not active"}
                                className="h-3 w-3"
                              />
                              {cell.match.active ? "Active" : "Not active"}
                            </span>
                            <StatusBadge
                              status={getMatchProgressStatus(progress)}
                              label={getMatchProgressLabel(progress)}
                            />
                          </div>
                          <span className="text-sm font-bold sm:text-base">
                            {cell.rowPoints} - {cell.columnPoints}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center sm:px-3 sm:py-3">
                    <div className="text-sm font-bold text-ui-text sm:text-base">
                      {rowStats?.wins ?? 0} - {rowStats?.losses ?? 0}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-ui-text-mute sm:mt-1 sm:text-sm">
                      {rowStats?.pointsFor ?? 0} - {rowStats?.pointsAgainst ?? 0}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedMatch && renderMatchCard(selectedMatch)}
    </div>
  );
}
