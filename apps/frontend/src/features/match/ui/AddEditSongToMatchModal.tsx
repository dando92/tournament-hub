import FormModal from "@/shared/components/ui/FormModal";
import SongRollPanel from "@/features/song/ui/SongRollPanel";
import AddEditSongTitleFields from "@/features/match/ui/AddEditSongTitleFields";
import { useAddEditSongToMatchModal } from "@/features/match/model/useAddEditSongToMatchModal";
import { RoundSourceRequest } from "@/features/match/model/types";

type AddSongToMatchModalProps = {
  tournamentId?: number;
  divisionId?: number;
  matchId?: number;
  editingRoundId: number | null;
  open: boolean;
  onClose: () => void;
  onAddRounds: (sources: RoundSourceRequest[]) => Promise<void>;
  onReplaceRoundSong: (roundId: number, source: RoundSourceRequest) => Promise<void>;
};

export default function AddEditSongToMatchModal(props: AddSongToMatchModalProps) {
  const state = useAddEditSongToMatchModal({
    open: props.open,
    tournamentId: props.tournamentId,
    divisionId: props.divisionId,
    matchId: props.matchId,
  });

  const validate = () => {
    if (state.songAddType === "roll") {
      if (state.roll.drawnSongIds.length === 0) {
        return ["Roll the songs before adding them."];
      }

      return props.editingRoundId !== null && state.roll.drawnSongIds.length > 1
        ? ["Replacing a song takes one card: take the others out of the draw."]
        : [];
    }

    return state.selectedSongs.length === 0 ? ["Choose at least one song."] : [];
  };

  const handleSubmit = async () => {
    const sources: RoundSourceRequest[] =
      state.songAddType === "roll"
        ? state.roll.drawnSongIds.map((songId) => ({ songId }))
        : state.selectedSongs.map((song) => ({ songId: song.id }));

    if (props.editingRoundId !== null) {
      await props.onReplaceRoundSong(props.editingRoundId, sources[0]);
      return;
    }

    await props.onAddRounds(sources);
  };

  return (
    <FormModal
      open={props.open}
      onClose={props.onClose}
      title={props.editingRoundId !== null ? "Edit song" : "Add song"}
      confirmText={props.editingRoundId !== null ? "Replace song" : "Add song"}
      validate={validate}
      onConfirm={handleSubmit}
      failureFallback="The song could not be set on the match."
    >
      <div className="w-full">
        <h3>Songs</h3>
        <div className="flex flex-row gap-3 mb-2">
          <div className="flex flex-row gap-1">
            <input
              type="radio"
              id="title"
              name="songAddType"
              value="title"
              checked={state.songAddType === "title"}
              onChange={() => state.setSongAddType("title")}
            />
            <label htmlFor="title">By title</label>
          </div>
          <div className="flex flex-row gap-1">
            <input
              type="radio"
              id="roll"
              name="songAddType"
              value="roll"
              checked={state.songAddType === "roll"}
              onChange={() => state.setSongAddType("roll")}
            />
            <label htmlFor="roll">By roll</label>
          </div>
        </div>

        {state.songAddType === "roll" ? (
          <SongRollPanel roll={state.roll} songGroups={state.songGroups} />
        ) : (
          <AddEditSongTitleFields
            songGroups={state.songGroups}
            selectedGroupName={state.selectedGroupName}
            selectedSongs={state.selectedSongs}
            filteredSongs={state.filteredSongs}
            onGroupChange={state.setSelectedGroupName}
            onSongsSelect={state.setSelectedSongs}
          />
        )}
      </div>
    </FormModal>
  );
}
