import axios from "axios";
import type { SongImportResultDto } from "@tournament-hub/contracts";
import { CreateSongRequest, Song, SongRollSlot } from "@/features/song/model/types";
import type { ImportRow } from "@/features/song/model/songImport/types";

export async function listSongs(tournamentId?: number): Promise<Song[]> {
  try {
    const response = await axios.get<Song[]>("songs", {
      params: tournamentId !== undefined ? { tournamentId } : undefined,
    });
    return response.data;
  } catch (error) {
    console.error("Error listing songs:", error);
    throw new Error("Unable to list songs.");
  }
}

export async function createSong(tournamentId: number, request: CreateSongRequest): Promise<number> {
  const response = await axios.post<{ id: number }>("songs", { ...request, tournamentId });
  return response.data.id;
}

export async function importSongs(tournamentId: number, songs: ImportRow[]): Promise<SongImportResultDto> {
  const response = await axios.post<SongImportResultDto>("songs/import", { tournamentId, songs });

  return response.data;
}

export type SongRollRequest = {
  divisionId: number;
  levels: number[];
  group?: string;
  allowPlayed?: boolean;
  excludeSongIds?: number[];
  matchId?: number;
};

export async function rollSongs(request: SongRollRequest): Promise<SongRollSlot[]> {
  try {
    const response = await axios.post<SongRollSlot[]>("songs/roll", request);
    return response.data;
  } catch (error) {
    console.error("Error rolling songs:", error);
    throw new Error("Unable to roll the songs.");
  }
}

export async function deleteSong(songId: number): Promise<void> {
  await axios.delete(`songs/${songId}`);
}
