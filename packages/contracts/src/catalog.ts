import type { SongRefDto } from './projections';
import type { ChartDifficulty } from './vocabulary';

export type SongDto = SongRefDto & {
    artist?: string;
    difficulty: number;
    group: string;
    chartDifficulty?: ChartDifficulty | null;
};

export type SongImportRowDto = {
    title: string;
    artist?: string;
    group: string;
    difficulty: number;
    chartDifficulty: ChartDifficulty;
};

export type SongImportResultDto = {
    imported: number;
    skipped: number;
};

export type SongRollSlotDto = {
    level: number;
    song: SongDto | null;
};
