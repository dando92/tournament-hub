import type { ScoringSystemType } from '@tournament-hub/scoring';
import type { DivisionSummaryDto } from './structure';
import type { TournamentStatus } from './vocabulary';

export type TournamentRefDto = {
    id: number;
    name: string;
};

export type TournamentDto = {
    id: number;
    name: string;
    status: TournamentStatus;
    closedAt: string | null;
    defaultScoringSystem: ScoringSystemType;
};

export type ControlRoomKeyStatusDto = {
    hasKey: boolean;
    issuedAt: string | null;
    lastUsedAt: string | null;
};

export type IssuedControlRoomKeyDto = {
    key: string;
};

export type TournamentConfigurationDto = {
    id: number;
    name: string;
    status: TournamentStatus;
    closedAt: string | null;
    transportRetentionDays: number;
    startggApiKey?: string | null;
    defaultScoringSystem: ScoringSystemType;
    controlRoomKey: ControlRoomKeyStatusDto;
};

export type TournamentOverviewDto = {
    divisionCount: number;
    playerCount: number;
    matchCount: number;
    divisions: DivisionSummaryDto[];
};

export type MyTournamentRolesDto = {
    isAdmin: boolean;
    canCreateTournament: boolean;
    ownedTournamentIds: number[];
    staffTournamentIds: number[];
};
