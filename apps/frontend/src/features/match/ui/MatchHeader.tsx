import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalculator, faMusic, faPenToSquare, faRotateLeft, faStickyNote, faTowerBroadcast, faTrash, faUserMinus, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { Match, MatchCommitState } from "@/features/match/model/types";
import { btnSecondary } from "@/styles/buttonStyles";
import ActionsMenu from "@/shared/components/ui/ActionsMenu";
import MusicPlusIcon from "@/shared/components/ui/MusicPlusIcon";

type Props = {
  match: Match;
  controls: boolean;
  commitState: MatchCommitState;
  showAddActions: boolean;
  canAddSong: boolean;
  handScored: boolean;
  canToggleHandScoring: boolean;
  onToggleHandScoring: () => void;
  onOpenEditNotes: () => void;
  onOpenEditScoringSystem: () => void;
  onDeleteMatch: (matchId: number) => void;
  onOpenAddSong: () => void;
  onOpenAddPlayer: () => void;
  canRemovePlayers: boolean;
  canRemoveSongs: boolean;
  onOpenRemovePlayers: () => void;
  onOpenRemoveSongs: () => void;
  onRenameMatch?: (matchId: number, name: string) => void;
  canEditAdvancementRules?: boolean;
  onEditAdvancementRules?: () => void;
  onToggleActive: () => void;
  onReopenMatch: () => void;
  manualActivationAllowed?: boolean;
};

export default function MatchHeader({
  match,
  controls,
  commitState,
  showAddActions,
  canAddSong,
  handScored,
  canToggleHandScoring,
  onToggleHandScoring,
  onOpenEditNotes,
  onOpenEditScoringSystem,
  onDeleteMatch,
  onOpenAddSong,
  onOpenAddPlayer,
  canRemovePlayers,
  canRemoveSongs,
  onOpenRemovePlayers,
  onOpenRemoveSongs,
  onRenameMatch,
  canEditAdvancementRules = false,
  onEditAdvancementRules,
  onToggleActive,
  onReopenMatch,
  manualActivationAllowed = true,
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isMatchEnded = Boolean(match.matchResult);
  const canToggleActive = manualActivationAllowed && (!isMatchEnded || match.active);

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  function startRename() {
    setRenameValue(match.name);
    setIsRenaming(true);
  }

  function commitRename() {
    const trimmed = renameValue.trim();
    setIsRenaming(false);
    if (trimmed && trimmed !== match.name && onRenameMatch) {
      onRenameMatch(match.id, trimmed);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {controls && isRenaming ? (
            <input
              ref={inputRef}
              className="text-base font-semibold text-ui-text border-b border-ui-border-strong outline-none bg-transparent w-40"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
            />
          ) : (
            <h3
              className={`text-base font-semibold text-ui-text ${controls ? "cursor-pointer hover:text-ui-text transition-colors" : ""}`}
              onClick={controls ? startRename : undefined}
              title={controls ? "Click to rename" : undefined}
            >
              {match.name}
            </h3>
          )}
          {controls ? (
            <button
              onClick={onOpenEditNotes}
              title={match.notes || "Add notes"}
              className={`text-sm ${match.notes ? "text-state-pending hover:text-state-pending/80" : "text-ui-text-mute hover:text-ui-text-soft"}`}
            >
              <FontAwesomeIcon icon={faStickyNote} />
            </button>
          ) : match.notes ? (
            <span title={match.notes} className="text-state-pending cursor-help text-sm">
              <FontAwesomeIcon icon={faStickyNote} />
            </span>
          ) : null}
        </div>
        {match.subtitle && (
          <p className="text-xs text-ui-text-mute mt-0.5">{match.subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3">
        {controls && (
          <>
            {showAddActions && !isMatchEnded && (
              <div className="flex items-center gap-1.5">
                <AddButton icon={<FontAwesomeIcon icon={faUserPlus} />} label="Player" onClick={onOpenAddPlayer} />
                <AddButton
                  icon={<MusicPlusIcon />}
                  label="Song"
                  onClick={onOpenAddSong}
                  disabled={!canAddSong}
                  title={
                    canAddSong
                      ? undefined
                      : handScored
                        ? "This match is scored by hand"
                        : "Add a player before adding a song"
                  }
                />
              </div>
            )}

            <ActionsMenu
              title="Match actions"
              items={[
                {
                  key: "active",
                  label: manualActivationAllowed
                    ? match.active ? "Set not active" : "Set active"
                    : "Activation controlled by Control Room",
                  icon: faTowerBroadcast,
                  disabled: !canToggleActive,
                  onSelect: onToggleActive,
                },
                {
                  key: "scoring-system",
                  label: "Edit scoring system",
                  icon: faCalculator,
                  hidden: isMatchEnded,
                  onSelect: onOpenEditScoringSystem,
                },
                {
                  key: "hand-scoring",
                  label: handScored ? "Score by songs" : "Score by hand",
                  icon: faCalculator,
                  hidden: isMatchEnded || !canToggleHandScoring,
                  onSelect: onToggleHandScoring,
                },
                {
                  key: "advancement",
                  label: "Edit advancement rules",
                  icon: faPenToSquare,
                  hidden: isMatchEnded || !canEditAdvancementRules,
                  onSelect: () => onEditAdvancementRules?.(),
                },
                {
                  key: "remove-players",
                  label: "Remove players",
                  icon: faUserMinus,
                  danger: true,
                  hidden: isMatchEnded || !canRemovePlayers,
                  className: "sm:hidden",
                  onSelect: onOpenRemovePlayers,
                },
                {
                  key: "remove-songs",
                  label: "Remove songs",
                  icon: faMusic,
                  danger: true,
                  hidden: isMatchEnded || !canRemoveSongs,
                  className: "sm:hidden",
                  onSelect: onOpenRemoveSongs,
                },
                {
                  key: "reopen",
                  label: "Re-open match",
                  icon: faRotateLeft,
                  hidden: commitState !== "Completed",
                  onSelect: onReopenMatch,
                },
                {
                  key: "delete",
                  label: "Delete match",
                  icon: faTrash,
                  danger: true,
                  onSelect: () => onDeleteMatch(match.id),
                  confirm: {
                    message: `Delete match "${match.name}"? This cannot be undone.`,
                    confirmText: "Delete match",
                  },
                },
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AddButton({
  icon,
  label,
  onClick,
  disabled = false,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? `Add ${label.toLowerCase()}`}
      aria-label={`Add ${label.toLowerCase()}`}
      className={`${btnSecondary} flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
