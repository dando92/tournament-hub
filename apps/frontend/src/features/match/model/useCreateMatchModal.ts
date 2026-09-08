import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchPath } from "@/features/match/model/matchPath";
import { Entrant } from "@/features/participant/model/types";
import { Song } from "@/features/song/model/types";
import { CreateMatchRequest } from "@/features/match/model/types";
import {
  isCompleteMatchPath,
  matchPathFromValue,
  matchPathLevels,
  matchPathValue,
} from "@/features/match/model/matchPath";
import type { PathValue } from "@/shared/components/ui/cascadingPath";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";
import { listDivisionEntrants } from "@/features/division/api/division.api";
import { getTournament } from "@/features/tournament/api/tournament.api";
import { listScoringSystems } from "@/features/match/api/match.api";
import { listSongs } from "@/features/song/api/song.api";
import { useSongRoll } from "@/features/song/model/useSongRoll";
import { readSongDialogChoices, writeSongDialogChoice } from "@/shared/lib/songDialogPreferences";

type UseCreateMatchModalOptions = {
  open: boolean;
  onCreate: (request: CreateMatchRequest) => Promise<void>;
  divisionId?: number;
  phaseId?: number;
  phaseGroupId?: number;
  tournamentId?: number;
};

export function useCreateMatchModal({
  open,
  onCreate,
  divisionId,
  phaseId,
  phaseGroupId,
  tournamentId,
}: UseCreateMatchModalOptions) {
  const { divisions } = useTournamentTree();
  const [path, setPath] = useState<MatchPath>({
    divisionId: divisionId ?? null,
    phaseId: phaseId ?? null,
    phaseGroupId: phaseGroupId ?? null,
  });
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [scoringSystems, setScoringSystems] = useState<string[]>([]);
  const [scoringSystem, setScoringSystem] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedEntrants, setSelectedEntrants] = useState<Entrant[]>([]);
  const [songAddType, setSongAddType] = useState<"title" | "roll">("title");
  const [songs, setSongs] = useState<Song[]>([]);
  const [songGroups, setSongGroups] = useState<string[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const roll = useSongRoll({ open, divisionId: path.divisionId ?? undefined, tournamentId, songGroups });

  const pathLevels = useMemo(() => matchPathLevels(divisions), [divisions]);
  const pathValue = useMemo(() => matchPathValue(path), [path]);
  const setPathValue = useCallback((value: PathValue<number>) => setPath(matchPathFromValue(value)), []);
  const validate = () => {
    const errors: string[] = [];
    if (!isCompleteMatchPath(path)) {
      errors.push("Choose the pool the match belongs to.");
    }
    if (!name.trim()) {
      errors.push("A match needs a name.");
    }

    return errors;
  };

  useEffect(() => {
    if (!open || divisions.length === 0) return;

    setPath({
      divisionId: divisionId ?? null,
      phaseId: phaseId ?? null,
      phaseGroupId: phaseGroupId ?? null,
    });
    setSelectedEntrants([]);
    setSelectedSongs([]);
    setSongAddType(readSongDialogChoices(tournamentId).mode);
  }, [divisions.length, divisionId, open, phaseGroupId, phaseId, tournamentId]);

  const chooseSongAddType = useCallback(
    (value: "title" | "roll") => {
      setSongAddType(value);
      writeSongDialogChoice(tournamentId, "mode", value);
    },
    [tournamentId],
  );

  useEffect(() => {
    if (!open || !path.divisionId) {
      setEntrants([]);
      return;
    }

    let cancelled = false;
    listDivisionEntrants(path.divisionId)
      .then((divisionEntrants) => {
        if (cancelled) return;
        setEntrants(
          divisionEntrants
            .filter((entrant) => entrant.status === "active" && entrant.type === "player")
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
      })
      .catch(() => {
        if (!cancelled) setEntrants([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, path.divisionId]);

  useEffect(() => {
    const entrantIds = new Set(entrants.map((entrant) => entrant.id));
    setSelectedEntrants((current) => current.filter((entrant) => entrantIds.has(entrant.id)));
  }, [entrants]);

  useEffect(() => {
    if (!open) return;
    listSongs(tournamentId)
      .then((catalog) => {
        setSongs(catalog);
        setSongGroups([...new Set(catalog.map((song) => song.group))]);
      })
      .catch(() => setSongs([]));
  }, [open, tournamentId]);

  useEffect(() => {
    if (!open) return;
    const scoringSystemsRequest = listScoringSystems();
    const tournamentRequest = tournamentId ? getTournament(tournamentId) : Promise.resolve(null);

    Promise.all([scoringSystemsRequest, tournamentRequest]).then(([systems, tournament]) => {
      const defaultScoringSystem = tournament?.defaultScoringSystem;
      setScoringSystems(systems);
      setScoringSystem(defaultScoringSystem && systems.includes(defaultScoringSystem) ? defaultScoringSystem : systems[0] ?? "");
    });
  }, [open, tournamentId]);

  const handleSubmit = async () => {
    if (!isCompleteMatchPath(path)) return;

    const baseRequest = {
      phaseGroupId: path.phaseGroupId,
      name: name.trim(),
      subtitle: subtitle.trim(),
      scoringSystem,
      entrantIds: selectedEntrants.map((entrant) => entrant.id),
    };

    const songIds = songAddType === "title" ? selectedSongs.map((song) => song.id) : roll.drawnSongIds;
    const request = { ...baseRequest, songIds } as CreateMatchRequest;

    await onCreate(request);
  };

  return {
    entrants,
    songs,
    songGroups,
    scoringSystems,
    selectedEntrants,
    selectedSongs,
    roll,
    scoringSystem,
    name,
    subtitle,
    songAddType,
    pathLevels,
    pathValue,
    validate,
    setPathValue,
    setSelectedEntrants,
    setSelectedSongs,
    setScoringSystem,
    setName,
    setSubtitle,
    setSongAddType: chooseSongAddType,
    handleSubmit,
  };
}
