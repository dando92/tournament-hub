import MatchCard from "@/features/match/ui/MatchCard";
import { useAdvancementTargets } from "@/features/match/model/useAdvancementTargets";
import { useMatches } from "@/features/match/model/useMatches";
import { Division } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";
import { Match, MatchHighlight, MatchNeighbour } from "@/features/match/model/types";
import { useManualMatchActivationAllowed } from "@/features/schedule/model/useSchedules";


type ConnectedMatchCardProps = {
  match: Match;
  division: Division;
  divisionEntrants: Entrant[];
  allMatches: MatchNeighbour[];
  actions: ReturnType<typeof useMatches>["actions"];
  controls: boolean;
  tournamentId?: number;
  highlight: MatchHighlight;
  onHighlight: (highlight: MatchHighlight) => void;
};

export default function ConnectedMatchCard({
  match,
  division,
  divisionEntrants,
  allMatches,
  actions,
  controls,
  tournamentId,
  highlight,
  onHighlight,
}: ConnectedMatchCardProps) {
  const loadAdvancementTargets = useAdvancementTargets(division.id);
  const manualActivationAllowed = useManualMatchActivationAllowed(tournamentId);

  return (
    <MatchCard
      match={match}
      division={division}
      divisionEntrants={divisionEntrants}
      allMatches={allMatches}
      controls={controls}
      tournamentId={tournamentId}
      highlight={highlight}
      onHighlight={onHighlight}
      enablePathRowHighlight
      loadAdvancementTargets={loadAdvancementTargets}
      onMatchUpdated={actions.list}
      onEditMatchNotes={actions.editMatchNotes}
      onRenameMatch={actions.renameMatch}
      onUpdateMatchScoringSystem={actions.updateMatchScoringSystem}
      onDeleteMatch={actions.deleteMatch}
      onAddPlayersToMatch={(entrantIds) => actions.updateMatchEntrants(match.id, entrantIds)}
      onAddRounds={async (sources) => {
        for (const source of sources) {
          await actions.addRound(match.id, source);
        }
      }}
      onReplaceRoundSong={actions.replaceRoundSong}
      onDeleteRound={actions.deleteRound}
      onAddHandScoredRound={() => actions.addRound(match.id)}
      onChangePoints={actions.savePoints}
      onAddStandingToMatch={(playerId, roundId, percentage, _score, isFailed, scoreId) =>
        actions.saveScore(playerId, roundId, { percentage, isFailed, scoreId })
      }
      onEditStanding={(playerId, roundId, percentage, _score, isFailed, scoreId) =>
        actions.saveScore(playerId, roundId, { percentage, isFailed, scoreId })
      }
      onDeleteStanding={actions.deleteStanding}
      onCreateTiebreak={(playerIds, songId) => actions.createTiebreak(match.id, playerIds, songId)}
      onDeleteTiebreak={(tiebreakId) => actions.deleteTiebreak(match.id, tiebreakId)}
      onSaveTiebreakScore={(tiebreakId, playerId, percentage, isFailed, scoreId) =>
        actions.saveTiebreakScore(match.id, tiebreakId, playerId, { percentage, isFailed, scoreId })
      }
      onSaveTiebreakPoints={(tiebreakId, playerId, points) => actions.saveTiebreakPoints(match.id, tiebreakId, playerId, points)}
      onClearTiebreakStanding={(tiebreakId, playerId) => actions.clearTiebreakStanding(match.id, tiebreakId, playerId)}
      onUpdateMatchAdvancementRules={actions.updateMatchAdvancementRules}
      onUpdateMatchActive={actions.updateMatchActive}
      onReopenMatchResult={actions.reopenMatchResult}
      manualActivationAllowed={manualActivationAllowed}
    />
  );
}
