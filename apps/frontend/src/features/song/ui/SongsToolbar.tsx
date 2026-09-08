import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Select from "@/shared/components/ui/Select";

type Props = {
  packFilter: string;
  songSearch: string;
  packOptions: string[];
  onPackFilterChange: (value: string) => void;
  onSongSearchChange: (value: string) => void;
};

export default function SongsToolbar({
  packFilter,
  songSearch,
  packOptions,
  onPackFilterChange,
  onSongSearchChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select
        className="sm:w-48 shrink-0"
        value={packFilter}
        onChange={onPackFilterChange}
        options={[{ value: "", label: "All packs" }, ...packOptions.map((group) => ({ value: group, label: group }))]}
      />

      <div className="relative flex-1">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-mute text-sm"
        />
        <input
          type="search"
          placeholder="Search by title or artist..."
          value={songSearch}
          onChange={(event) => onSongSearchChange(event.target.value)}
          className="w-full border border-ui-border-strong rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent"
        />
      </div>
    </div>
  );
}
