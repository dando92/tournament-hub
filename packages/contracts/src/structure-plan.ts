import type { EntrantType } from './vocabulary';


export type PlanAction = 'create' | 'link' | 'skip' | 'remove';

export type PlanNodeKind = 'division' | 'phase' | 'phaseGroup' | 'match' | 'participant' | 'entrant';

export type PlanLinkEvidence = 'mapping' | 'name';

export type PlanAttention = 'ambiguous-person' | 'no-tournament-scope';

export type PlanExternalIdentity = {
    provider: 'startgg';
    externalType: string;
    externalId: string;
};

export type PlanNode = {
    localId: string;
    kind: PlanNodeKind;
    parentLocalId?: string | null;
    action: PlanAction;
    localRowId?: number | null;
    linkEvidence?: PlanLinkEvidence | null;
    needsAttention?: PlanAttention | null;
    external?: PlanExternalIdentity | null;
    name: string;

    subtitle?: string | null;
    bracketType?: string | null;
    scoringSystem?: string | null;
    entrantLocalIds?: string[];
    entrantRowIds?: number[];
    songIds?: number[];
    participantLocalIds?: string[];
    seedNum?: number | null;
    entrantType?: EntrantType | null;
    localPlayerId?: number | null;
};

export type PlanRoute = {
    sourceLocalId: string;
    sourcePlacement: number;
    targetLocalId: string;
    targetSlot: number;
};

export type PlanSlot = {
    targetLocalId: string;
    targetSlot: number;
};

export type PlanSource =
    | { kind: 'manual' }
    | { kind: 'generator'; bracketType: string; playerPerMatch: number }
    | { kind: 'startgg'; eventSlug: string; eventName: string; readAt: string };

export type PlanBasis = {
    divisionId: number;
    structureVersion: number;
};

export type StructurePlan = {
    tournamentId: number;
    source: PlanSource;
    basedOn: PlanBasis[];
    nodes: PlanNode[];
    routes: PlanRoute[];
    clearedSlots?: PlanSlot[];
};

export type PlanCountsDto = {
    kind: PlanNodeKind;
    create: number;
    link: number;
    skip: number;
    remove: number;
};

export type StructurePlanAppliedDto = {
    tournamentId: number;
    rowIdByLocalId: Record<string, number>;
};
