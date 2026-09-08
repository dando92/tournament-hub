import type { EntrantType } from './vocabulary';


export type StartggImportParticipantPlanDto = {
    externalId: string;
    gamerTag: string;
    action: string;
    localParticipantId: number | null;
    localPlayerId: number | null;
};

export type StartggImportEntrantPlanDto = {
    externalId: string;
    name: string;
    type: EntrantType;
    seedNum: number | null;
    action: string;
    localEntrantId: number | null;
    participantExternalIds: string[];
};

export type StartggImportPhasePlanDto = {
    externalId: string;
    name: string;
    action: string;
    localPhaseId: number | null;
};

export type StartggImportMatchPlanDto = {
    externalId: string;
    name: string;
    action: string;
    localMatchId: number | null;
    phaseExternalId: string;
    entrantExternalIds: string[];
};

export type StartggImportCountsDto = {
    participants: number;
    entrants: number;
    phases: number;
    matches: number;
};

export type StartggImportResponseDto = {
    tournamentId: number;
    divisionId: number;
    imported: StartggImportCountsDto;
};
