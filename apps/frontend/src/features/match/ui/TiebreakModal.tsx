import { useEffect, useMemo, useState } from "react";

import { Match } from "@/features/match/model/types";
import { openTies } from "@/features/match/model/tiebreaks";
import { listSongs } from "@/features/song/api/song.api";
import { Song } from "@/features/song/model/types";
import { useSongRoll } from "@/features/song/model/useSongRoll";
import SongRollPanel from "@/features/song/ui/SongRollPanel";
import FormModal from "@/shared/components/ui/FormModal";
import Select from "@/shared/components/ui/Select";
import { displaySongTitle } from "@/features/song/model/songTitle";

type Props = {
  open: boolean;
  match: Match;
  tournamentId?: number;
  divisionId?: number;
  onClose: () => void;
  onCreate: (playerIds: number[], songId?: number) => Promise<void>;
};

type Mode = "song" | "roll" | "manual";

export default function TiebreakModal({ open, match, tournamentId, divisionId, onClose, onCreate }: Props) {
  const [tieIndex, setTieIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("song");
  const [songs, setSongs] = useState<Song[]>([]);
  const [songId, setSongId] = useState<number | null>(null);
  const songGroups = useMemo(() => [...new Set(songs.map((song) => song.group))], [songs]);
  const roll = useSongRoll({ open, divisionId, matchId: match.id, tournamentId, songGroups });
  const ties = openTies(match);
  const playersById = useMemo(() => new Map(
    match.entrants.flatMap((entrant) => entrant.participants ?? [])
      .map((participant) => participant.player)
      .filter(Boolean)
      .map((player) => [player.id, player]),
  ), [match.entrants]);

  useEffect(() => {
    if (!open) return;
    setTieIndex(0);
    setMode("song");
    listSongs(tournamentId)
      .then((catalog) => {
        setSongs(catalog);
        setSongId(catalog[0]?.id ?? null);
      })
      .catch(() => {
        setSongs([]);
        setSongId(null);
      });
  }, [open, tournamentId]);

  const tie = ties[tieIndex] ?? null;

  const validate = () => {
    const errors: string[] = [];
    if (!tie) {
      errors.push("There is no tied placement left to resolve.");
    }
    if (mode === "song" && songId === null) {
      errors.push("Choose the song that breaks the tie.");
    }
    if (mode === "roll") {
      if (roll.drawnSongIds.length === 0) {
        errors.push("Roll the song before creating the tiebreak.");
      } else if (roll.drawnSongIds.length > 1) {
        errors.push("A tiebreak is played on one song: take the others out of the draw.");
      }
    }

    return errors;
  };

  const chosenSongId = () => {
    if (mode === "song") return songId ?? undefined;
    if (mode === "roll") return roll.drawnSongIds[0];

    return undefined;
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Create tiebreak"
      confirmText="Create tiebreak"
      validate={validate}
      onConfirm={() => onCreate(tie!.playerIds, chosenSongId())}
      failureFallback="The tiebreak could not be created."
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4 text-sm text-ui-text">
        {ties.length > 1 && (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Tied placement</span>
            <Select
              value={tieIndex}
              onChange={setTieIndex}
              options={ties.map((candidate, index) => ({
                value: index,
                label: `Places ${candidate.fromPlacement}–${candidate.toPlacement}`,
              }))}
            />
          </label>
        )}

        {tie && (
          <div>
            <div className="mb-1 font-semibold">Players</div>
            <div className="text-ui-text-soft">
              {tie.playerIds.map((playerId) => playersById.get(playerId)?.playerName ?? `Player ${playerId}`).join(" · ")}
            </div>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 font-semibold">Resolution method</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" checked={mode === "song"} onChange={() => setMode("song")} />
              Song
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" checked={mode === "roll"} onChange={() => setMode("roll")} />
              By roll
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" checked={mode === "manual"} onChange={() => setMode("manual")} />
              By hand
            </label>
          </div>
        </fieldset>

        {mode === "song" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Song</span>
            <Select
              value={songId}
              onChange={setSongId}
              options={songs.map((song) => ({ value: song.id, label: displaySongTitle(song.title) }))}
              placeholder="No songs available"
            />
          </label>
        )}

        {mode === "roll" && <SongRollPanel roll={roll} songGroups={songGroups} />}
      </div>
    </FormModal>
  );
}
