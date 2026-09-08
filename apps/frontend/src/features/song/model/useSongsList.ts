import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Song } from "@/features/song/model/types";
import { deleteSong, listSongs } from "@/features/song/api/song.api";
import { songKeys } from "@/features/song/api/song.keys";
import { readExpandedSongPacks, writeExpandedSongPacks } from "@/shared/lib/songPackPreferences";

type Params = {
  tournamentId?: number;
};

const noSongs: Song[] = [];

export function useSongsList({ tournamentId }: Params) {
  const [packFilter, setPackFilter] = useState("");
  const [songSearch, setSongSearch] = useState("");
  const [expandedPacks, setExpandedPacks] = useState(readExpandedSongPacks);
  const songsQuery = useQuery({
    queryKey: songKeys.forTournament(tournamentId),
    queryFn: () => listSongs(tournamentId),
  });
  const deleteMutation = useMutation({ mutationFn: deleteSong });
  const songs = songsQuery.data ?? noSongs;
  const packOptions = useMemo(
    () => [...new Set(songs.map((song) => song.group))].sort(),
    [songs],
  );

  function togglePack(pack: string) {
    const next = new Set(expandedPacks);
    if (!next.delete(pack)) {
      next.add(pack);
    }

    setExpandedPacks(next);
    writeExpandedSongPacks(next);
  }

  async function handleDeleteSong(id: number) {
    await deleteMutation.mutateAsync(id);
  }

  async function handleDeletePack(pack: string) {
    const packSongs = songs.filter((song) => song.group === pack);
    await Promise.allSettled(packSongs.map((song) => deleteMutation.mutateAsync(song.id)));
  }

  return {
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
  };
}
