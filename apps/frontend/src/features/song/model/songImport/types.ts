import type { ChartDifficulty, SongImportRowDto } from "@tournament-hub/contracts";

export type ChartMode = "all" | "highest";

export type ParsedChart = {
  stepstype: string;
  meter: number;
  difficulty: ChartDifficulty | null;
};

export type ParsedSimfile = {
  artist: string;
  charts: ParsedChart[];
};

export type ScannedSong = {
  pack: string;
  folder: string;
  songPath: string;
  artist: string;
  charts: ParsedChart[];
};

export type ScanResult = {
  rootName: string;
  packs: string[];
  songs: ScannedSong[];
  warnings: string[];
};

export type ImportRow = SongImportRowDto;

export type ImportSelection = {
  rows: ImportRow[];
  warnings: string[];
};
