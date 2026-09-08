import { useMemo, type ReactNode } from "react";
import { Division } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";
import { PoolViewMode } from "@/shared/lib/poolViewMode";
import EliminationMatchesView from "@/features/match/ui/bracket/EliminationMatchesView";
import MatchCard from "@/features/match/ui/MatchCard";
import RawMatchCardsView from "@/features/match/ui/RawMatchCardsView";
import RoundRobinMatchesView from "@/features/match/ui/round-robin/RoundRobinMatchesView";
import { useAdvancementTargets } from "@/features/match/model/useAdvancementTargets";
import { useMatches } from "@/features/match/model/useMatches";
import { Match, MatchHighlight } from "@/features/match/model/types";
import CreateCard from "@/shared/components/ui/CreateCard";

type MatchListProps = {
  division: Division;
  divisionEntrants: Entrant[];
  controls?: boolean;
  tournamentId?: number;
  phaseGroupId?: number;
  viewMode: PoolViewMode;
  highlight: MatchHighlight;
  onHighlight: (highlight: MatchHighlight) => void;
  onCreateMatch?: () => void;
};

export default function MatchList({
  division,
  divisionEntrants,
  controls = false,
  tournamentId,
  phaseGroupId,
  viewMode,
  highlight,
  onHighlight,
  onCreateMatch,
}: MatchListProps) {
  const { matches, actions } = useMatches(division.id, phaseGroupId);
  const loadAdvancementTargets = useAdvancementTargets(division.id);
  const allMatches = matches;

  const phaseGroups = useMemo(
    () => (division.phases ?? []).flatMap((phase) => phase.phaseGroups ?? []),
    [division.phases],
  );
  const hasBracketEdges = useMemo(
    () => {
      const matchIds = new Set(matches.map((match) => match.id));
      return matches.some((match) =>
        (match.advancementRules ?? []).some(
          (rule) => rule.sourceKind === "match" && rule.targetKind === "match" && matchIds.has(rule.targetId),
        ),
      );
    },
    [matches],
  );
  const usesBracketTree = viewMode === "bracket" && hasBracketEdges;
  const bracketTreeUnavailable = viewMode === "bracket" && !hasBracketEdges;
  const usesRoundRobinTable = viewMode === "roundRobin";

  const refreshMatches = () => {
    actions.list();
  };

  const renderMatchCard = (match: Match, enablePathRowHighlight = false): ReactNode => (
    <MatchCard
      key={match.id}
      controls={controls}
      division={division}
      divisionEntrants={divisionEntrants}
      allMatches={allMatches}
      loadAdvancementTargets={phaseGroupId !== undefined ? loadAdvancementTargets : undefined}
      tournamentId={tournamentId}
      highlight={highlight}
      onHighlight={onHighlight}
      enablePathRowHighlight={enablePathRowHighlight}
      onDeleteStanding={actions.deleteStanding}
      onCreateTiebreak={(playerIds, songId) => actions.createTiebreak(match.id, playerIds, songId)}
      onDeleteTiebreak={(tiebreakId) => actions.deleteTiebreak(match.id, tiebreakId)}
      onSaveTiebreakScore={(tiebreakId, playerId, percentage, isFailed, scoreId) =>
        actions.saveTiebreakScore(match.id, tiebreakId, playerId, { percentage, isFailed, scoreId })
      }
      onSaveTiebreakPoints={(tiebreakId, playerId, points) => actions.saveTiebreakPoints(match.id, tiebreakId, playerId, points)}
      onClearTiebreakStanding={(tiebreakId, playerId) => actions.clearTiebreakStanding(match.id, tiebreakId, playerId)}
      onMatchUpdated={refreshMatches}
      onEditMatchNotes={actions.editMatchNotes}
      onRenameMatch={actions.renameMatch}
      onUpdateMatchScoringSystem={actions.updateMatchScoringSystem}
      onDeleteMatch={actions.deleteMatch}
      onAddPlayersToMatch={(entrantIds) =>
        actions.updateMatchEntrants(match.id, entrantIds)
      }
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
      onUpdateMatchAdvancementRules={actions.updateMatchAdvancementRules}
      onUpdateMatchActive={actions.updateMatchActive}
      onReopenMatchResult={actions.reopenMatchResult}
      match={match}
    />
  );

  return (
    <div className="mt-4">
      {matches.length === 0 ? (
        onCreateMatch ? (
          <CreateCard label="Create match" onClick={onCreateMatch} />
        ) : (
          <p className="text-center text-ui-text-mute text-sm py-8">No matches yet.</p>
        )
      ) : usesRoundRobinTable ? (
        <>
          <RoundRobinMatchesView
            matches={matches}
            renderMatchCard={(match) => renderMatchCard(match, true)}
          />
          {onCreateMatch && <CreateCard label="Create match" onClick={onCreateMatch} className="mt-4" />}
        </>
      ) : usesBracketTree ? (
        <>
          <EliminationMatchesView
            matches={matches}
            phaseGroups={phaseGroups}
            renderMatchCard={renderMatchCard}
          />
          {onCreateMatch && <CreateCard label="Create match" onClick={onCreateMatch} className="mt-4" />}
        </>
      ) : (
        <>
          {bracketTreeUnavailable && (
            <p className="mb-3 rounded border border-state-pending/30 bg-state-pending/10 px-3 py-2 text-xs text-ui-text-soft">
              These matches carry no advancement rule between them, so there is no bracket to draw yet. They are listed
              as cards until one match feeds another.
            </p>
          )}
          <RawMatchCardsView
            matches={matches}
            renderMatchCard={(match) => renderMatchCard(match, true)}
            onCreateMatch={onCreateMatch}
          />
        </>
      )}
    </div>
  );
}
