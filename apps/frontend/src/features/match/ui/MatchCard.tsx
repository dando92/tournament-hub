import { Match, MatchAdvancementRuleInput, MatchHighlight, MatchNeighbour, RoundSourceRequest } from "@/features/match/model/types";
import { Division } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";
import AddEditSongToMatchModal from "@/features/match/ui/AddEditSongToMatchModal";
import AddPlayersToMatchModal from "@/features/match/ui/AddPlayersToMatchModal";
import { useEffect, useRef, useState } from "react";
import StandingModal from "@/features/match/ui/StandingModal";
import EditMatchNotesModal from "@/features/match/ui/EditMatchNotesModal";
import EditScoringSystemModal from "@/features/match/ui/EditScoringSystemModal";
import MatchHeader from "@/features/match/ui/MatchHeader";
import MatchEmptySlots from "@/features/match/ui/MatchEmptySlots";
import MatchTable from "@/features/match/ui/MatchTable";
import AdvancementRulesModal from "@/features/match/ui/AdvancementRulesModal";
import { getMatchCommitState, getMatchProgress } from "@/features/match/model/matchStatus";
import { entrantPlayers } from "@/features/participant/model/entrant";
import TiebreakModal from "@/features/match/ui/TiebreakModal";
import RemoveMatchItemsModal from "@/features/match/ui/RemoveMatchItemsModal";
import { displaySongTitle } from "@/features/song/model/songTitle";
import { btnPrimary } from "@/styles/buttonStyles";

type MatchCardProps = {
  division: Division;
  divisionEntrants: Entrant[];
  match: Match;
  allMatches: MatchNeighbour[];
  loadAdvancementTargets?: () => Promise<MatchNeighbour[]>;
  controls?: boolean;
  tournamentId?: number;
  highlight?: MatchHighlight;
  onHighlight?: (highlight: MatchHighlight) => void;
  enablePathRowHighlight?: boolean;
  allowMobileTableScroll?: boolean;
  onMatchUpdated: () => void;
  onDeleteMatch: (matchId: number) => void;
  onAddPlayersToMatch: (entrantIds: number[]) => Promise<void>;
  onAddRounds: (sources: RoundSourceRequest[]) => Promise<void>;
  onReplaceRoundSong: (roundId: number, source: RoundSourceRequest) => Promise<void>;
  onDeleteRound: (roundId: number) => Promise<void>;
  onAddHandScoredRound: () => Promise<void> | void;
  onChangePoints: (playerId: number, roundId: number, points: number) => void;
  onAddStandingToMatch: (
    playerId: number,
    roundId: number,
    percentage: number,
    score: number,
    isFailed: boolean,
    scoreId?: number,
  ) => Promise<void>;
  onEditMatchNotes: (matchId: number, notes: string) => Promise<void>;
  onUpdateMatchScoringSystem: (matchId: number, scoringSystem: string) => Promise<void>;
  onRenameMatch?: (matchId: number, name: string) => void;
  onEditStanding: (
    playerId: number,
    roundId: number,
    percentage: number,
    score: number,
    isFailed: boolean,
    scoreId?: number,
  ) => Promise<void>;
  onDeleteStanding: (playerId: number, roundId: number) => Promise<void>;
  onCreateTiebreak: (playerIds: number[], songId?: number) => Promise<void>;
  onDeleteTiebreak: (tiebreakId: number) => void;
  onSaveTiebreakScore: (
    tiebreakId: number,
    playerId: number,
    percentage: number,
    isFailed: boolean,
    scoreId?: number,
  ) => Promise<void>;
  onSaveTiebreakPoints: (tiebreakId: number, playerId: number, points: number) => void;
  onClearTiebreakStanding: (tiebreakId: number, playerId: number) => Promise<void>;
  onUpdateMatchAdvancementRules?: (matchId: number, rules: MatchAdvancementRuleInput[]) => Promise<void>;
  onUpdateMatchActive?: (matchId: number, active: boolean) => Promise<void>;
  onReopenMatchResult?: (matchId: number) => Promise<void>;
  manualActivationAllowed?: boolean;
};

type StandingModalState = {
  open: boolean;
  mode: "add" | "edit";
  playerId: number;
  roundId: number;
  songId: number;
  playerName: string;
  songTitle: string;
  initialPercentage?: number;
  initialScore?: number;
  initialScoreId?: number;
  initialIsFailed?: boolean;
  target: "round" | "tiebreak";
};

const closedModal: StandingModalState = {
  open: false,
  mode: "add",
  playerId: 0,
  roundId: 0,
  songId: 0,
  playerName: "",
  songTitle: "",
  target: "round",
};

export default function MatchCard({
  division,
  divisionEntrants,
  match,
  allMatches,
  loadAdvancementTargets,
  controls = false,
  tournamentId,
  highlight = { matchId: null, phaseGroupId: null },
  onHighlight = () => {},
  enablePathRowHighlight = false,
  allowMobileTableScroll = true,
  onMatchUpdated,
  onDeleteMatch,
  onAddPlayersToMatch,
  onAddRounds,
  onReplaceRoundSong,
  onDeleteRound,
  onAddHandScoredRound,
  onChangePoints,
  onAddStandingToMatch,
  onEditMatchNotes,
  onUpdateMatchScoringSystem,
  onRenameMatch,
  onDeleteStanding,
  onCreateTiebreak,
  onDeleteTiebreak,
  onSaveTiebreakScore,
  onSaveTiebreakPoints,
  onClearTiebreakStanding,
  onEditStanding,
  onUpdateMatchAdvancementRules,
  onUpdateMatchActive,
  onReopenMatchResult,
  manualActivationAllowed = true,
}: MatchCardProps) {
  const [addSongToMatchModalOpen, setAddSongToMatchModalOpen] = useState(false);
  const [addPlayersToMatchModalOpen, setAddPlayersToMatchModalOpen] = useState(false);
  const [editRoundId, setEditRoundId] = useState<number | null>(null);
  const [standingModal, setStandingModal] = useState<StandingModalState>(closedModal);
  const [editMatchNotesModalOpen, setEditMatchNotesModalOpen] = useState(false);
  const [editScoringSystemModalOpen, setEditScoringSystemModalOpen] = useState(false);
  const [tiebreakModalOpen, setTiebreakModalOpen] = useState(false);
  const [removeItemsModal, setRemoveItemsModal] = useState<"players" | "songs" | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingAdvancementRules, setPendingAdvancementRules] = useState<MatchAdvancementRuleInput[]>([]);
  const [advancementTargetMatches, setAdvancementTargetMatches] = useState<MatchNeighbour[] | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handScoredRound = match.rounds.find((round) => round.song === null) ?? null;
  const isHighlighted = match.id === highlight.matchId;
  const progress = getMatchProgress(match);
  const commitState = getMatchCommitState(match);
  const matchPlayers = entrantPlayers(match.entrants);
  const removablePlayers = (match.entrants ?? [])
    .filter((entrant) => entrant.type === "player")
    .map((entrant) => ({ id: entrant.id, label: entrant.name }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const removableSongs = match.rounds
    .filter((round) => round.song !== null && (round.standings ?? []).length === 0)
    .map((round) => ({ id: round.id, label: displaySongTitle(round.song!.title) }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const hasIncomingRoutes = (match.advancementRules ?? []).some(
    (rule) => rule.targetKind === "match" && rule.targetId === match.id,
  );
  const showEmptySlots =
    controls &&
    !match.matchResult &&
    match.rounds.length === 0 &&
    matchPlayers.length === 0 &&
    !hasIncomingRoutes;

  useEffect(() => {
    if (!isHighlighted) return;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isHighlighted]);

  function enterEditMode() {
    setPendingAdvancementRules(
      (match.advancementRules ?? [])
        .filter((rule) => rule.sourceKind === "match" && rule.sourceId === match.id)
        .map((rule) => ({
          sourcePlacement: rule.sourcePlacement,
          targetKind: rule.targetKind,
          targetId: rule.targetId,
          targetSlot: rule.targetSlot,
        })),
    );
    setAdvancementTargetMatches(allMatches);
    setEditMode(true);
    loadAdvancementTargets?.()
      .then(setAdvancementTargetMatches)
      .catch(() => setAdvancementTargetMatches(allMatches));
  }

  function cancelEditMode() {
    setEditMode(false);
    setPendingAdvancementRules([]);
    setAdvancementTargetMatches(null);
  }

  async function saveEditMode() {
    if (onUpdateMatchAdvancementRules) {
      await onUpdateMatchAdvancementRules(match.id, pendingAdvancementRules);
    }
    onMatchUpdated();
  }

  function openAddSong() {
    if (match.matchResult || handScoredRound) return;
    setAddSongToMatchModalOpen(true);
  }

  async function toggleHandScoring() {
    if (!controls || match.matchResult) return;

    if (handScoredRound) {
      if ((handScoredRound.standings ?? []).some((standing) => standing.points > 0)) {
        const confirmed = window.confirm("Points assigned by hand will be deleted. Continue?");
        if (!confirmed) return;
      }
      onDeleteRound(handScoredRound.id);
      return;
    }

    if (match.rounds.length > 0) return;
    await onAddHandScoredRound();
  }

  function songIdOfRound(roundId: number): number {
    return match.rounds.find((round) => round.id === roundId)?.song?.id ?? 0;
  }

  async function toggleActive() {
    if (!controls) return;
    await onUpdateMatchActive?.(match.id, !match.active);
  }

  async function reopenMatch() {
    if (!controls || commitState !== "Completed") return;
    await onReopenMatchResult?.(match.id);
  }

  return (
    <div
      ref={cardRef}
      className={`group/match my-1 flex w-full flex-col rounded-xl border bg-ui-surface p-2.5 transition-shadow max-sm:[&_.match-score-percentage]:!text-[11px] max-sm:[&_h3]:text-sm max-sm:[&_p]:text-[10px] max-sm:[&_table]:text-xs max-sm:[&_td]:px-1.5 max-sm:[&_td]:py-2 max-sm:[&_th]:px-1.5 max-sm:[&_th]:py-2 sm:my-3 sm:p-4 ${
        isHighlighted
          ? "border-ui-accent border-l-[3px] bg-ui-selected shadow-live"
          : match.active
            ? "border-ui-border-strong shadow-live"
            : "border-ui-border shadow-card"
      }`}
    >
      <AddEditSongToMatchModal
        editingRoundId={editRoundId}
        tournamentId={tournamentId}
        divisionId={division.id}
        matchId={match.id}
        open={addSongToMatchModalOpen}
        onAddRounds={onAddRounds}
        onReplaceRoundSong={onReplaceRoundSong}
        onClose={() => {
          setAddSongToMatchModalOpen(false);
          setEditRoundId(null);
        }}
      />
      <AddPlayersToMatchModal
        open={addPlayersToMatchModalOpen}
        divisionEntrants={divisionEntrants}
        matchEntrants={match.entrants ?? []}
        onAddPlayers={onAddPlayersToMatch}
        onClose={() => setAddPlayersToMatchModalOpen(false)}
      />
      <StandingModal
        {...standingModal}
        onClose={() => setStandingModal(closedModal)}
        onDelete={standingModal.mode === "edit" ? () => {
          if (standingModal.target === "tiebreak") {
            return onClearTiebreakStanding(standingModal.roundId, standingModal.playerId);
          }
          return onDeleteStanding(standingModal.playerId, standingModal.roundId);
        } : undefined}
        onSave={(playerId, roundId, pct, score, isFailed, scoreId) => {
          if (standingModal.target === "tiebreak") {
            return onSaveTiebreakScore(roundId, playerId, pct, isFailed, scoreId);
          }
          if (standingModal.mode === "add") {
            return onAddStandingToMatch(playerId, roundId, pct, score, isFailed, scoreId);
          }

          return onEditStanding(playerId, roundId, pct, score, isFailed, scoreId);
        }}
      />
      <TiebreakModal
        open={tiebreakModalOpen}
        match={match}
        tournamentId={tournamentId}
        divisionId={division.id}
        onClose={() => setTiebreakModalOpen(false)}
        onCreate={onCreateTiebreak}
      />
      <RemoveMatchItemsModal
        open={removeItemsModal !== null}
        title={removeItemsModal === "players" ? "Remove players from match" : "Remove songs from match"}
        emptyMessage={removeItemsModal === "players" ? "No players can be removed." : "No songs without standings can be removed."}
        items={removeItemsModal === "players" ? removablePlayers : removableSongs}
        onClose={() => setRemoveItemsModal(null)}
        onRemove={async (ids) => {
          if (removeItemsModal === "players") {
            await onAddPlayersToMatch((match.entrants ?? []).filter((entrant) => !ids.includes(entrant.id)).map((entrant) => entrant.id));
            return;
          }
          for (const roundId of ids) {
            await onDeleteRound(roundId);
          }
        }}
      />
      <EditMatchNotesModal
        match={match}
        open={editMatchNotesModalOpen}
        onClose={() => setEditMatchNotesModalOpen(false)}
        onSave={onEditMatchNotes}
      />
      <EditScoringSystemModal
        match={match}
        open={editScoringSystemModalOpen}
        onClose={() => setEditScoringSystemModalOpen(false)}
        onSave={onUpdateMatchScoringSystem}
      />
      <AdvancementRulesModal
        open={editMode}
        sourceKind="match"
        sourceId={match.id}
        rules={pendingAdvancementRules}
        division={division}
        allMatches={advancementTargetMatches ?? allMatches}
        onChange={setPendingAdvancementRules}
        onSave={saveEditMode}
        onCancel={cancelEditMode}
      />

      <MatchHeader
        match={match}
        controls={controls}
        commitState={commitState}
        showAddActions={!showEmptySlots}
        canAddSong={matchPlayers.length > 0 && handScoredRound === null}
        handScored={handScoredRound !== null}
        canToggleHandScoring={handScoredRound !== null || match.rounds.length === 0}
        onToggleHandScoring={toggleHandScoring}
        onOpenEditNotes={() => setEditMatchNotesModalOpen(true)}
        onOpenEditScoringSystem={() => setEditScoringSystemModalOpen(true)}
        onDeleteMatch={onDeleteMatch}
        onOpenAddSong={openAddSong}
        onOpenAddPlayer={() => setAddPlayersToMatchModalOpen(true)}
        canRemovePlayers={removablePlayers.length > 0}
        canRemoveSongs={removableSongs.length > 0}
        onOpenRemovePlayers={() => setRemoveItemsModal("players")}
        onOpenRemoveSongs={() => setRemoveItemsModal("songs")}
        onRenameMatch={onRenameMatch}
        canEditAdvancementRules={controls && !editMode}
        onEditAdvancementRules={enterEditMode}
        onToggleActive={toggleActive}
        onReopenMatch={reopenMatch}
        manualActivationAllowed={manualActivationAllowed}
      />

      {controls && progress === "tiebreakRequired" && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-state-pending/30 bg-state-pending/10 px-3 py-2">
          <span className="text-sm text-ui-text-soft">A tied placement has different advancement destinations.</span>
          <button type="button" className={`${btnPrimary} text-sm`} onClick={() => setTiebreakModalOpen(true)}>
            Create tiebreak
          </button>
        </div>
      )}

      {showEmptySlots && (
        <MatchEmptySlots
          canAddSong={matchPlayers.length > 0}
          onAddSong={openAddSong}
          onAddPlayer={() => setAddPlayersToMatchModalOpen(true)}
        />
      )}

      {!showEmptySlots && (
        <MatchTable
          match={match}
          division={division}
          allMatches={allMatches}
          controls={controls}
          highlight={highlight}
          onHighlight={onHighlight}
          enablePathRowHighlight={enablePathRowHighlight}
          allowMobileTableScroll={allowMobileTableScroll}
          onDeleteRound={onDeleteRound}
          onDeletePlayer={(entrantId) =>
            onAddPlayersToMatch(
              (match.entrants ?? [])
                .filter((entrant) => entrant.id !== entrantId)
                .map((entrant) => entrant.id),
            )
          }
          onOpenAddStanding={(playerId, roundId, playerName, songTitle) =>
            setStandingModal({ open: true, mode: "add", target: "round", playerId, roundId, songId: songIdOfRound(roundId), playerName, songTitle })
          }
          onOpenEditStanding={(playerId, roundId, playerName, songTitle, scoreId, percentage, score, isFailed) =>
            setStandingModal({ open: true, mode: "edit", target: "round", playerId, roundId, songId: songIdOfRound(roundId), playerName, songTitle, initialScoreId: scoreId, initialPercentage: percentage, initialScore: score, initialIsFailed: isFailed })
          }
          onDeleteStanding={onDeleteStanding}
          onChangePoints={onChangePoints}
          onDeleteTiebreak={onDeleteTiebreak}
          onOpenAddTiebreakStanding={(playerId, tiebreakId, playerName, songTitle) =>
            setStandingModal({ open: true, mode: "add", target: "tiebreak", playerId, roundId: tiebreakId, songId: match.tiebreaks.find((candidate) => candidate.id === tiebreakId)?.song?.id ?? 0, playerName, songTitle })
          }
          onOpenEditTiebreakStanding={(playerId, tiebreakId, playerName, songTitle, scoreId, percentage, isFailed) =>
            setStandingModal({ open: true, mode: "edit", target: "tiebreak", playerId, roundId: tiebreakId, songId: match.tiebreaks.find((candidate) => candidate.id === tiebreakId)?.song?.id ?? 0, playerName, songTitle, initialScoreId: scoreId, initialPercentage: percentage, initialScore: 0, initialIsFailed: isFailed })
          }
          onChangeTiebreakPoints={onSaveTiebreakPoints}
        />
      )}
    </div>
  );
}
