export type { SongDto as Song, SongRollSlotDto as SongRollSlot } from "@tournament-hub/contracts";

export type CreateSongRequest = {
  title: string;
  artist?: string;
  difficulty: number;
  group: string;
};
