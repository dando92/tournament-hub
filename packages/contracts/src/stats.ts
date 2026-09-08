import type { AdvancementCompetitionKind, EntrantStatus } from './vocabulary';

export type GradeMixDto = {
    quad: number;
    star: number;
    s: number;
    a: number;
    b: number;
    failed: number;
};

export type PlacementRunStepDto = {
    label: string;
    name: string;
    won: boolean;
};

export type DivisionPlacementRowDto = {
    entrantId: number;
    entrantName: string;
    playerId: number | null;
    playerName: string | null;
    status: EntrantStatus;
    nationality: string;
    seedNum: number | null;
    placement: number;
    sharedThrough: number;
    exitKind: AdvancementCompetitionKind;
    exitId: number;
    exitName: string;
    points: number;
    songsPlayed: number;
    averagePercentage: number | null;
    run: PlacementRunStepDto[];
};

export type DivisionPlacementsDto = {
    divisionId: number;
    divisionName: string;
    complete: boolean;
    endings: number;
    rows: DivisionPlacementRowDto[];
};

export type SongStatsRowDto = {
    songId: number;
    title: string;
    artist: string | null;
    group: string;
    difficulty: number;
    playedCount: number;
    playerCount: number;
    failedCount: number;
    averagePercentage: number | null;
    bestPercentage: number | null;
    percentageSpread: number | null;
    grades: GradeMixDto;
};

export type PlayerStatsRowDto = {
    playerId: number;
    playerName: string;
    nationality: string;
    points: number;
    songsPlayed: number;
    failedCount: number;
    averagePercentage: number | null;
    bestPercentage: number | null;
    bestSongTitle: string | null;
    percentageSpread: number | null;
    matchesPlayed: number;
    matchesWon: number;
    grades: GradeMixDto;
};
