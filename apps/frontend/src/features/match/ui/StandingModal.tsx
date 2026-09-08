import FormModal from "@/shared/components/ui/FormModal";
import Select from "@/shared/components/ui/Select";
import { useStandingModal } from "@/features/match/model/useStandingModal";
import DeleteConfirmButton from "@/shared/components/ui/DeleteConfirmButton";
import { displaySongTitle } from "@/features/song/model/songTitle";

type StandingModalProps = {
  mode: "add" | "edit";
  open: boolean;
  playerName: string;
  songTitle: string;
  playerId: number;
  roundId: number;
  songId: number;
  initialPercentage?: number;
  initialScore?: number;
  initialScoreId?: number;
  initialIsFailed?: boolean;
  onClose: () => void;
  onDelete?: () => void | Promise<void>;
  onSave: (
    playerId: number,
    roundId: number,
    percentage: number,
    score: number,
    isFailed: boolean,
    scoreId?: number,
  ) => Promise<void>;
};

export default function StandingModal({
  mode,
  open,
  playerName,
  songTitle,
  playerId,
  roundId,
  songId,
  initialPercentage,
  initialScoreId,
  initialIsFailed,
  onClose,
  onDelete,
  onSave,
}: StandingModalProps) {
  const visibleSongTitle = displaySongTitle(songTitle);
  const {
    percentage,
    isFailed,
    scoreOptions,
    selectedScoreId,
    selectedScore,
    loadingScores,
    isRegisteredScoreMode,
    percentageIsValid,
    canSave,
    normalizedPercentage,
    setPercentage,
    setIsFailed,
    setSelectedScoreId,
  } = useStandingModal({ open, playerId, songId, initialPercentage, initialScoreId, initialIsFailed });

  const handleSave = () =>
    onSave(
      playerId,
      roundId,
      parseFloat(normalizedPercentage),
      0,
      isFailed,
      selectedScoreId ? Number(selectedScoreId) : undefined,
    );

  const validate = () => {
    if (canSave) {
      return [];
    }

    return [isRegisteredScoreMode ? "Choose the registered score to use." : "A percentage reads as a number between 0 and 100."];
  };

  const deleteStanding = mode === "edit" && onDelete
    ? (
        <DeleteConfirmButton
          onConfirm={async () => {
            await onDelete();
            onClose();
          }}
          title="Delete standing"
          confirmTitle="Delete standing"
          confirmMessage={`Delete ${playerName}'s standing for "${visibleSongTitle}"?`}
          confirmText="Delete"
        >
          Delete
        </DeleteConfirmButton>
      )
    : undefined;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add standing" : "Edit standing"}
      confirmText="Save"
      validate={validate}
      onConfirm={handleSave}
      leadingActions={deleteStanding}
      failureFallback="The standing could not be saved."
    >
      <p className="text-sm text-ui-text-mute">
        {playerName} for {visibleSongTitle}
      </p>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ui-text-soft">Registered score</label>
          <Select
            className="mt-1"
            value={selectedScoreId}
            onChange={setSelectedScoreId}
            options={[
              { value: "", label: "Manual score" },
              ...scoreOptions.map((score) => ({
                value: String(score.id),
                label: `#${score.id} - ${score.percentage.toFixed(2)}%${score.isFailed ? " failed" : ""}`,
              })),
            ]}
            disabled={loadingScores}
          />
        </div>
        {isRegisteredScoreMode && selectedScore ? (
          <div className="rounded-md border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text-soft">
            Using score #{selectedScore.id}: {selectedScore.percentage.toFixed(2)}%
            {selectedScore.isFailed ? " failed" : ""}. Manual fields are hidden while a registered score is selected.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-ui-text-soft">Percentage</label>
              <input
                type="text"
                inputMode="decimal"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-ui-accent focus:border-ui-border-strong sm:text-sm ${
                  percentageIsValid ? "border-ui-border-strong" : "border-state-failed/30"
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFailed"
                checked={isFailed}
                onChange={(e) => setIsFailed(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isFailed" className="text-sm font-medium text-ui-text-soft">
                Failed
              </label>
            </div>
          </>
        )}
      </div>
    </FormModal>
  );
}
