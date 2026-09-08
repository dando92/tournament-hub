import { useCallback, useEffect, useMemo, useState } from "react";
import { Song } from "@/features/song/model/types";
import { listSongs } from "@/features/song/api/song.api";
import { useSongRoll } from "@/features/song/model/useSongRoll";
import { readSongDialogChoices, rememberedPack, writeSongDialogChoice } from "@/shared/lib/songDialogPreferences";

type UseAddEditSongToMatchModalOptions = {
  open: boolean;
  tournamentId?: number;
  divisionId?: number;
  matchId?: number;
};

export function useAddEditSongToMatchModal({
  open,
  tournamentId,
  divisionId,
  matchId,
}: UseAddEditSongToMatchModalOptions) {
  const [songAddType, setSongAddType] = useState<"title" | "roll">("title");
  const [songs, setSongs] = useState<Song[]>([]);
  const [songGroups, setSongGroups] = useState<string[]>([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const roll = useSongRoll({ open, divisionId, matchId, tournamentId, songGroups });

  useEffect(() => {
    if (!open) return;
    const choices = readSongDialogChoices(tournamentId);
    listSongs(tournamentId)
      .then((catalog) => {
        const groups = [...new Set(catalog.map((song) => song.group))];
        setSongs(catalog);
        setSongGroups(groups);
        setSelectedGroupName(rememberedPack(choices.titlePack, groups, groups[0] ?? ""));
      })
      .catch(() => setSongs([]));
    setSongAddType(choices.mode);
    setSelectedSongs([]);
  }, [open, tournamentId]);

  const chooseGroupName = useCallback(
    (group: string) => {
      setSelectedGroupName(group);
      writeSongDialogChoice(tournamentId, "titlePack", group);
    },
    [tournamentId],
  );

  const chooseSongAddType = useCallback(
    (value: "title" | "roll") => {
      setSongAddType(value);
      writeSongDialogChoice(tournamentId, "mode", value);
    },
    [tournamentId],
  );

  const filteredSongs = useMemo(
    () =>
      songs.filter((song) => {
        const matchesGroup = !selectedGroupName || song.group === selectedGroupName;
        return matchesGroup;
      }),
    [selectedGroupName, songs],
  );

  useEffect(() => {
    setSelectedSongs((prev) => prev.filter((song) => filteredSongs.some((filteredSong) => filteredSong.id === song.id)));
  }, [filteredSongs]);

  return {
    songAddType,
    songs,
    songGroups,
    selectedGroupName,
    selectedSongs,
    filteredSongs,
    roll,
    setSongAddType: chooseSongAddType,
    setSelectedGroupName: chooseGroupName,
    setSelectedSongs,
  };
}
