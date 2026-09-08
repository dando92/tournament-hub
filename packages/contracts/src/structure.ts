import type { AdvancementRuleDto } from './match';
import type { EntrantDto } from './projections';
import type { PhaseGroupEntrantStatus, PhaseGroupState } from './vocabulary';


export type PhaseGroupEntrantDto = {
    seedNum: number | null;
    slot: number | null;
    status: PhaseGroupEntrantStatus;
    entrant: EntrantDto;
};

export type PhaseGroupDto = {
    id: number;
    name: string;
    displayIdentifier: string | null;
    bracketType: string | null;
    state: PhaseGroupState;
    matchCount: number;
    progressedMatchCount: number;
    pendingMatchCount: number;
    advancementRules: AdvancementRuleDto[];
};

export type DivisionPhaseDto = {
    id: number;
    name: string;
    matchCount: number;
    phaseGroups: PhaseGroupDto[];
};

export type DivisionSummaryDto = {
    id: number;
    name: string;
    structureVersion: number;
    entrantCount: number;
    matchCount: number;
    phases: DivisionPhaseDto[];
};

export type DivisionStandingRowDto = {
    id: number;
    playerName: string;
    points: number;
    songsPlayed: number;
};

export type GenerateBracketResultDto = {
    phaseId: number;
    phaseGroupId: number;
};
