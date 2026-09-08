import { Song } from "@/features/song/model/types";
import Select from "@/shared/components/ui/Select";
import MultiSelect, { MultiSelectOption } from "@/shared/components/ui/MultiSelect";
import { displaySongLabel } from "@/features/song/model/songTitle";

type AddEditSongTitleFieldsProps = {
  songGroups: string[];
  selectedGroupName: string;
  selectedSongs: Song[];
  filteredSongs: Song[];
  onGroupChange: (group: string) => void;
  onSongsSelect: (songs: Song[]) => void;
};

export default function AddEditSongTitleFields({
  songGroups,
  selectedGroupName,
  selectedSongs,
  filteredSongs,
  onGroupChange,
  onSongsSelect,
}: AddEditSongTitleFieldsProps) {
  const songOptions = filteredSongs.map((song) => ({
    value: song.id,
    label: displaySongLabel(song),
  }));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="mb-2">Select pack</h3>
        <Select
          options={songGroups.map((group) => ({ value: group, label: group }))}
          placeholder="Select pack…"
          value={selectedGroupName}
          onChange={onGroupChange}
        />
      </div>

      <div>
        <h3 className="mb-2">Select songs</h3>
        {filteredSongs.length === 0 ? (
          <div className="rounded-lg border border-ui-border bg-ui-raised px-3 py-4 text-sm text-ui-text-mute italic">
            No songs match the current filters.
          </div>
        ) : (
          <MultiSelect
            options={songOptions}
            value={selectedSongs.map((song) => ({
              value: song.id,
              label: displaySongLabel(song),
            }))}
            onChange={(selected) =>
              onSongsSelect(
                selected
                  .map((option: MultiSelectOption) => filteredSongs.find((song) => song.id === option.value))
                  .filter((song): song is Song => Boolean(song)),
              )
            }
            placeholder="Select songs..."
          />
        )}
      </div>
    </div>
  );
}
