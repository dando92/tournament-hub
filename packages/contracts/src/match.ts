import type { ScoringSystemType } from '@tournament-hub/scoring';
import type { AdvancementCompetitionKind, EntrantType, MatchState } from './vocabulary';
import type { EntrantDto, PlayerRefDto, ScoreDto, SongRefDto } from './projections';

export type MatchStandingDto = {
    id: number;
    points: number;
    player: PlayerRefDto;
    score: ScoreDto | null;
};

export type MatchRoundDto = {
    id: number;
    song: SongRefDto | null;
    standings: MatchStandingDto[];
};

export type MatchResultEntryDto = {
    playerId: number;
    points: number;
    placement: number;
};

export type MatchTiebreakStandingDto = {
    id: number;
    player: PlayerRefDto;
    score: ScoreDto | null;
    manualPoints: number | null;
};

export type MatchTiebreakDto = {
    id: number;
    sequence: number;
    invalidated: boolean;
    song: SongRefDto | null;
    standings: MatchTiebreakStandingDto[];
};

export type MatchPlacementTieDto = {
    playerIds: number[];
    fromPlacement: number;
    toPlacement: number;
};

export type MatchResultStateDto = {
    status: 'incomplete' | 'tiebreak_required' | 'ready' | 'completed';
    entries: MatchResultEntryDto[];
    ambiguousTies: MatchPlacementTieDto[];
};

export type MatchResultDto = {
    id: number;
    playerPoints: MatchResultEntryDto[];
};

export type AdvancementRuleDto = {
    id: number;
    sourceKind: AdvancementCompetitionKind;
    sourceId: number;
    sourceName: string | null;
    sourcePlacement: number;
    targetKind: AdvancementCompetitionKind;
    targetId: number;
    targetName: string | null;
    targetSlot: number;
};

export type MatchDto = {
    id: number;
    name: string;
    subtitle: string;
    notes: string;
    scoringSystem: ScoringSystemType;
    active: boolean;
    state: MatchState;
    entrants: EntrantDto[];
    rounds: MatchRoundDto[];
    tiebreaks: MatchTiebreakDto[];
    advancementRules: AdvancementRuleDto[];
    resultState: MatchResultStateDto;
    matchResult?: MatchResultDto | null;
    phaseGroupId: number;
};

export type MatchSummaryEntrantDto = {
    id: number;
    name: string;
    type: EntrantType;
    player: PlayerRefDto | null;
};

export type MatchSummaryDto = {
    id: number;
    name: string;
    subtitle: string;
    active: boolean;
    state: MatchState;
    phaseGroupId: number;
    entrants: MatchSummaryEntrantDto[];
    incomingRules: AdvancementRuleDto[];
    songCount: number;
    handScored: boolean;
    missingScoreCount: number;
    tiebreakInProgress: boolean;
    winner: PlayerRefDto | null;
};

export type StartggReportStatus = 'reported' | 'skipped' | 'failed';

export type CommitMatchResultResponseDto = {
    startggReport: StartggReportStatus;
};
