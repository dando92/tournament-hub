import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Song } from "@/features/song/model/types";
import { createSong, listSongs } from "@/features/song/api/song.api";
import { useSongImport } from "@/features/song/model/useSongImport";
import { songKeys } from "@/features/song/api/song.keys";

type UseTournamentHeaderSongsManageMenuOptions = {
  tournamentId: number;
};

const noSongs: Song[] = [];

export function useTournamentHeaderSongsManageMenu({
  tournamentId,
}: UseTournamentHeaderSongsManageMenuOptions) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addInGroupOpen, setAddInGroupOpen] = useState(false);
  const [addInNewGroupOpen, setAddInNewGroupOpen] = useState(false);
  const songImport = useSongImport({ tournamentId });
  const songsQuery = useQuery({
    queryKey: songKeys.forTournament(tournamentId),
    queryFn: () => listSongs(tournamentId),
  });
  const createMutation = useMutation({
    mutationFn: (input: { title: string; difficulty: number; group: string; artist?: string }) =>
      createSong(tournamentId, input),
  });
  const songs = songsQuery.data ?? noSongs;
  const loadingSongsMeta = songsQuery.isLoading;

  const songGroups = useMemo(
    () => [...new Set(songs.map((song) => song.group))].sort(),
    [songs],
  );
  const selectedGroupName = songGroups[0] ?? "";

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);
  const openAddInGroup = () => {
    closeMenu();
    setAddInGroupOpen(true);
  };
  const openAddInNewGroup = () => {
    closeMenu();
    setAddInNewGroupOpen(true);
  };

  const triggerImport = () => {
    closeMenu();
    void songImport.start();
  };

  const handleCreateSong = async (
    title: string,
    difficulty: number,
    group: string,
    artist?: string,
  ) => {
    await createMutation.mutateAsync({ title, artist, difficulty, group });
  };

  return {
    menuOpen,
    addInGroupOpen,
    addInNewGroupOpen,
    loadingSongsMeta,
    songGroups,
    selectedGroupName,
    songImport,
    setAddInGroupOpen,
    setAddInNewGroupOpen,
    openMenu,
    closeMenu,
    openAddInGroup,
    openAddInNewGroup,
    triggerImport,
    handleCreateSong,
  };
}
