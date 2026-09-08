import SongsToolbar from "@/features/song/ui/SongsToolbar";
import { useSongsList } from "@/features/song/model/useSongsList";
import SongListView from "./SongListView";

type SongsListProps = {
  canEdit?: boolean;
  tournamentId?: number;
};

export default function SongsList({
  canEdit = true,
  tournamentId,
}: SongsListProps) {
  const {
    songs,
    packFilter,
    songSearch,
    packOptions,
    expandedPacks,
    setPackFilter,
    setSongSearch,
    togglePack,
    handleDeleteSong,
    handleDeletePack,
  } = useSongsList({ tournamentId });

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto">
      <SongsToolbar
        packFilter={packFilter}
        songSearch={songSearch}
        packOptions={packOptions}
        onPackFilterChange={setPackFilter}
        onSongSearchChange={setSongSearch}
      />
      <SongListView
        songs={songs}
        packFilter={packFilter}
        songSearch={songSearch}
        canEdit={canEdit}
        expandedPacks={expandedPacks}
        onTogglePack={togglePack}
        onDelete={handleDeleteSong}
        onDeletePack={handleDeletePack}
      />
    </div>
  );
}
