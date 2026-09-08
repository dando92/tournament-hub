import { Song } from "@/features/song/model/types";
import MultiSelect, { MultiSelectOption } from "@/shared/components/ui/MultiSelect";
import SongRollPanel from "@/features/song/ui/SongRollPanel";
import type { SongRollState } from "@/features/song/model/useSongRoll";
import { displaySongTitle } from "@/features/song/model/songTitle";

type CreateMatchSongFieldsProps = {
  songAddType: "title" | "roll";
  songs: Song[];
  songGroups: string[];
  selectedSongs: Song[];
  roll: SongRollState;
  onSongAddTypeChange: (value: "title" | "roll") => void;
  onSelectedSongsChange: (songs: Song[]) => void;
};

export default function CreateMatchSongFields({
  songAddType,
  songs,
  songGroups,
  selectedSongs,
  roll,
  onSongAddTypeChange,
  onSelectedSongsChange,
}: CreateMatchSongFieldsProps) {
  const songOptions = songs.map((song) => ({ value: song.id, label: displaySongTitle(song.title) }));

  return (
    <div className="w-full">
      <h3>Songs</h3>
      <div className="flex flex-row gap-3 mb-2">
        <div className="flex flex-row gap-1">
          <input
            type="radio"
            id="title"
            name="songAddType"
            value="title"
            checked={songAddType === "title"}
            onChange={() => onSongAddTypeChange("title")}
          />
          <label htmlFor="title">By titles</label>
        </div>
        <div className="flex flex-row gap-1">
          <input
            type="radio"
            id="roll"
            name="songAddType"
            value="roll"
            checked={songAddType === "roll"}
            onChange={() => onSongAddTypeChange("roll")}
          />
          <label htmlFor="roll">By roll</label>
        </div>
      </div>

      {songAddType === "roll" && <SongRollPanel roll={roll} songGroups={songGroups} />}

      {songAddType === "title" && (
        <MultiSelect
          options={songOptions}
          value={selectedSongs.map((song) => ({ value: song.id, label: displaySongTitle(song.title) }))}
          onChange={(selected) =>
            onSelectedSongsChange(
              selected
                .map((option: MultiSelectOption) => songs.find((song) => song.id === option.value))
                .filter((song): song is Song => Boolean(song)),
            )
          }
        />
      )}
    </div>
  );
}
