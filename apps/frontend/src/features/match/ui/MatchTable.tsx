import { AdvancementCompetitionKind, Match, MatchHighlight, MatchNeighbour } from "@/features/match/model/types";
import { Division } from "@/features/division/model/types";
import { entrantPlayers } from "@/features/participant/model/entrant";
import { useStandingOrder } from "@/features/match/model/useStandingOrder";
import MatchRow from "@/features/match/ui/MatchRow";
import PathRow from "@/features/match/ui/PathRow";
import DeleteConfirmButton from "@/shared/components/ui/DeleteConfirmButton";
import { toOrdinal } from "@/shared/utils";
import MobileMatchTable from "@/features/match/ui/MobileMatchTable";
import OverflowMarquee from "@/shared/components/ui/OverflowMarquee";
import { displaySongTitle } from "@/features/song/model/songTitle";

type ScoreEntry = { scoreId: number; score: number; percentage: number; isFailed: boolean };

type MatchTableProps = {
  match: Match;
  division: Division;
  allMatches: MatchNeighbour[];
  controls: boolean;
  highlight: MatchHighlight;
  onHighlight: (highlight: MatchHighlight) => void;
  enablePathRowHighlight?: boolean;
  allowMobileTableScroll?: boolean;
  onDeleteRound: (roundId: number) => void;
  onDeletePlayer: (entrantId: number) => void;
  onOpenAddStanding: (playerId: number, roundId: number, playerName: string, songTitle: string) => void;
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
  onDeleteTiebreak: (tiebreakId: number) => void;
  onOpenAddTiebreakStanding: (playerId: number, tiebreakId: number, playerName: string, songTitle: string) => void;
  onOpenEditTiebreakStanding: (playerId: number, tiebreakId: number, playerName: string, songTitle: string, scoreId: number, percentage: number, isFailed: boolean) => void;
  onChangeTiebreakPoints: (tiebreakId: number, playerId: number, points: number) => void;
};

export default function MatchTable({
  match,
  division,
  allMatches,
  controls,
  highlight,
  onHighlight,
  enablePathRowHighlight = false,
  allowMobileTableScroll = true,
  onDeleteRound,
  onDeletePlayer,
  onOpenAddStanding,
  onOpenEditStanding,
  onDeleteStanding,
  onChangePoints,
  onDeleteTiebreak,
  onOpenAddTiebreakStanding,
  onOpenEditTiebreakStanding,
  onChangeTiebreakPoints,
}: MatchTableProps) {
  const scoreTable: Record<string, ScoreEntry> = {};
  match.rounds.forEach((round) => {
    (round.standings ?? []).forEach((standing) => {
      if (!standing.score) return;
      scoreTable[`${standing.player.id}-${round.id}`] = {
        scoreId: standing.score.id,
        score: standing.points,
        percentage: Number(standing.score.percentage),
        isFailed: standing.score.isFailed,
      };
    });
  });

  const matchPlayers = entrantPlayers(match.entrants);
  const entrantIdByPlayerId = new Map(
    (match.entrants ?? [])
      .map((entrant) => {
        const player = entrant.participants?.[0]?.player;
        return player ? [player.id, entrant.id] as const : null;
      })
      .filter((entry): entry is readonly [number, number] => Boolean(entry)),
  );
  const sortedPlayers = useStandingOrder(match, matchPlayers);
  const sortedMatchResults = [...(match.matchResult?.playerPoints ?? [])].sort(
    (a, b) => a.placement - b.placement || a.playerId - b.playerId,
  );
  const routeByPlayerId = new Map(
    sortedMatchResults
      .map((result) => {
        const route = (match.advancementRules ?? []).find(
          (rule) => rule.sourceKind === "match" && rule.sourceId === match.id && rule.sourcePlacement === result.placement,
        );
        if (!route || route.targetKind !== "match") {
          return [result.playerId, null] as const;
        }
        return [result.playerId, route.targetId] as const;
      }),
  );

  const incomingRules = (match.advancementRules ?? []).filter(
    (rule) => rule.targetKind === "match" && rule.targetId === match.id,
  );
  const sourceKeys = Array.from(new Set(incomingRules.map((rule) => `${rule.sourceKind}:${rule.sourceId}`)));
  const hasContent = sortedPlayers.length > 0 || incomingRules.length > 0 || sortedMatchResults.length > 0;
  const canEditMatchContent = controls && !match.matchResult;

  const totalCols = Math.max(3, match.rounds.length + match.tiebreaks.length + 4);
  const phaseGroups = (division.phases ?? []).flatMap((phase) => phase.phaseGroups ?? []);
  const getPhaseGroupName = (phaseGroupId: number) => phaseGroups.find((phaseGroup) => phaseGroup.id === phaseGroupId)?.name ?? `Pool ${phaseGroupId}`;
  const getHighlightForTarget = (targetKind: AdvancementCompetitionKind, targetId: number): MatchHighlight => {
    if (targetKind === "match") {
      const targetMatch = allMatches.find((candidate) => candidate.id === targetId);
      return { matchId: targetId, phaseGroupId: targetMatch?.phaseGroupId ?? null };
    }
    return { matchId: null, phaseGroupId: targetId };
  };
  const isHighlightSelected = (target: MatchHighlight) =>
    highlight.matchId === target.matchId && highlight.phaseGroupId === target.phaseGroupId;
  const toggleHighlight = (target: MatchHighlight) => {
    onHighlight(isHighlightSelected(target) ? { matchId: null, phaseGroupId: null } : target);
  };

  return (
    <>
      <div className={`${allowMobileTableScroll ? "overflow-x-auto" : "overflow-x-hidden sm:overflow-x-auto"} hidden rounded-lg border border-ui-border bg-ui-row sm:block`}>
        <table className="w-full text-sm border-collapse">
          {match.rounds.length === 0 && (
            <thead>
              <tr className="bg-ui-raised text-[10px] uppercase tracking-wider text-ui-text-mute">
                <th className="px-2 py-2.5 w-8" />
                <th className="px-3 py-2.5 text-left font-semibold">Player</th>
              </tr>
            </thead>
          )}
          {match.rounds.length > 0 && (
            <thead>
              <tr className="bg-ui-raised text-[10px] uppercase tracking-wider text-ui-text-mute">
                <th className="px-2 py-2.5 w-8" />
                <th className="px-3 py-2.5 text-left font-semibold w-[120px] sm:w-[160px]">Player</th>
                {match.rounds.map((round) => {
                  const song = round.song;
                  const roundHasStandings = song
                    ? (round.standings ?? []).length > 0
                    : (round.standings ?? []).some((standing) => standing.points > 0);
                  const title = song ? displaySongTitle(song.title) : "By hand";
                  return (
                    <th key={round.id} className={`px-1 sm:px-3 py-2.5 text-center font-semibold ${song ? "min-w-[70px]" : "min-w-[92px]"} sm:min-w-[130px]`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <OverflowMarquee text={title} className="max-w-[110px]" />
                        {canEditMatchContent && !roundHasStandings && (
                          <DeleteConfirmButton
                            onConfirm={() => onDeleteRound(round.id)}
                            title={song ? "Remove song" : "Remove hand scoring"}
                            className="shrink-0"
                            iconClassName="text-xs"
                            confirmMessage={
                              song
                                ? `Remove song "${title}" from this match?`
                                : "Stop scoring this match by hand?"
                            }
                            confirmText="Remove"
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="px-1 sm:px-3 py-2.5 text-center font-semibold w-[48px] sm:w-[72px]">Pts</th>
                {match.tiebreaks.map((tiebreak) => (
                  <th key={tiebreak.id} className="min-w-[130px] border-l border-ui-border bg-ui-selected/40 px-3 py-2.5 text-center font-semibold">
                    <div className="flex items-center justify-center gap-1.5">
                      <OverflowMarquee
                        text={`TB ${tiebreak.sequence} · ${tiebreak.song ? displaySongTitle(tiebreak.song.title) : "By hand"}`}
                        className="max-w-[180px]"
                      />
                      {tiebreak.invalidated && <span className="text-state-failed">Invalid</span>}
                      {canEditMatchContent && (
                        <DeleteConfirmButton
                          onConfirm={() => onDeleteTiebreak(tiebreak.id)}
                          title="Remove tiebreak"
                          confirmMessage={`Remove tiebreak ${tiebreak.sequence}?`}
                          confirmText="Remove"
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-[72px] border-l border-ui-border px-2 py-2.5 text-center font-semibold">Place</th>
              </tr>
            </thead>
          )}

          <tbody>
            {!hasContent && (
              <tr>
                <td colSpan={totalCols} className="px-3 py-6 text-center text-ui-text-mute text-sm">
                  No match data available
                </td>
              </tr>
            )}

            {sourceKeys.flatMap((sourceKey) => {
              const [sourceKind, rawSourceId] = sourceKey.split(":");
              const typedSourceKind = sourceKind as AdvancementCompetitionKind;
              const sourceId = Number(rawSourceId);
              const sourceMatch = typedSourceKind === "match" ? allMatches.find((m) => m.id === sourceId) : null;
              const sourcePhaseGroup = typedSourceKind === "phase_group"
                ? phaseGroups.find((phaseGroup) => phaseGroup.id === sourceId) ?? null
                : null;
              const rulesFromSource = incomingRules.filter((rule) => rule.sourceKind === typedSourceKind && rule.sourceId === sourceId);
              const name = rulesFromSource[0]?.sourceName ?? sourceMatch?.name ?? sourcePhaseGroup?.name ?? (
                typedSourceKind === "match" ? `Match ${sourceId}` : `Pool ${sourceId}`
              );
              const positions = rulesFromSource.map((rule) => rule.sourcePlacement);

              const rows = positions.length > 0 ? positions : [1];

              const isSourceComplete = typedSourceKind === "match"
                ? sourceMatch?.state === "completed"
                : sourcePhaseGroup?.state === "completed";
              if (isSourceComplete) return [];
              const sourceHighlight = getHighlightForTarget(typedSourceKind, sourceId);
              const isSelected = isHighlightSelected(sourceHighlight);

              return rows.map((pos) => (
                <PathRow
                  key={`${typedSourceKind}-${sourceId}-${pos}`}
                  ordinalLabel={toOrdinal(pos)}
                  sourceMatchName={name}
                  colSpan={totalCols}
                  isSelected={enablePathRowHighlight && isSelected}
                  onToggle={enablePathRowHighlight ? () => toggleHighlight(sourceHighlight) : undefined}
                />
              ));
            })}

            {sortedPlayers.map((player) => (
              (() => {
                const routeTargetMatchId = routeByPlayerId.get(player.id) ?? null;
                const routeTargetMatch = routeTargetMatchId ? allMatches.find((candidate) => candidate.id === routeTargetMatchId) : null;
                const routeTargetHighlight: MatchHighlight | null = routeTargetMatchId
                  ? { matchId: routeTargetMatchId, phaseGroupId: routeTargetMatch?.phaseGroupId ?? null }
                  : null;
                return (
                  <MatchRow
                    key={player.id}
                    match={match}
                    player={player}
                    controls={canEditMatchContent}
                    scoreTable={scoreTable}
                    hasRoute={enablePathRowHighlight && routeTargetMatchId !== null}
                    isRouteSelected={enablePathRowHighlight && routeTargetHighlight !== null && isHighlightSelected(routeTargetHighlight)}
                    routeTargetMatchId={enablePathRowHighlight ? routeTargetMatchId : null}
                    routeTargetLabel={enablePathRowHighlight && routeTargetMatch ? `${getPhaseGroupName(routeTargetMatch.phaseGroupId)} / ${routeTargetMatch.name}` : undefined}
                    canClearRouteHighlight={enablePathRowHighlight && (highlight.matchId !== null || highlight.phaseGroupId !== null)}
                    onToggleRouteHighlight={() => {
                      if (routeTargetHighlight) toggleHighlight(routeTargetHighlight);
                    }}
                    onClearRouteHighlight={() => onHighlight({ matchId: null, phaseGroupId: null })}
                    onDeletePlayer={(playerId) => {
                      const entrantId = entrantIdByPlayerId.get(playerId);
                      if (entrantId) onDeletePlayer(entrantId);
                    }}
                    onOpenAddStanding={onOpenAddStanding}
                    onOpenEditStanding={onOpenEditStanding}
                    onDeleteStanding={onDeleteStanding}
                    onChangePoints={onChangePoints}
                    onOpenAddTiebreakStanding={onOpenAddTiebreakStanding}
                    onOpenEditTiebreakStanding={onOpenEditTiebreakStanding}
                    onChangeTiebreakPoints={onChangeTiebreakPoints}
                  />
                );
              })()
            ))}

          </tbody>
        </table>
      </div>

      <MobileMatchTable
        match={match}
        controls={canEditMatchContent}
        onOpenAddStanding={onOpenAddStanding}
        onOpenEditStanding={onOpenEditStanding}
        onChangePoints={onChangePoints}
        onOpenAddTiebreakStanding={onOpenAddTiebreakStanding}
        onOpenEditTiebreakStanding={onOpenEditTiebreakStanding}
        onChangeTiebreakPoints={onChangeTiebreakPoints}
      />

    </>
  );
}
