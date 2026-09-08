export type StartggTournamentRef = {
    id: string;
    name: string;
    slug?: string | null;
};

export type StartggSeedNode = {
    id: string;
    seedNum: number;
    entrantId?: string | null;
    groupSeedNum?: number | null;
    phaseGroupId?: string | null;
    progressionSource?: {
        originPhaseGroupId?: string | null;
        originPlacement?: number | null;
    } | null;
};

export type StartggParticipantNode = {
    id: string;
    gamerTag: string;
    entrantId: string;
};

export type StartggEntrantNode = {
    id: string;
    name: string;
    participants: StartggParticipantNode[];
};

export type StartggSetNode = {
    id: string;
    fullRoundText?: string | null;
    state?: number | string | null;
    completedAt?: number | null;
    winnerId?: string | null;
    phaseId?: string | null;
    phaseName?: string | null;
    phaseGroupId?: string | null;
    phaseGroupName?: string | null;
    slots: Array<{
        prereqId?: string | null;
        prereqPlacement?: number | null;
        prereqType?: string | null;
        entrant?: {
            id: string;
            name: string;
        } | null;
        standing?: {
            placement?: number | null;
            score?: number | null;
        } | null;
    }>;
    entrants: Array<{
        id: string;
        name: string;
    }>;
};

export type StartggReportedSetNode = {
    id: string;
    state?: number | null;
};

export type StartggBracketSetGameDataInput = {
    winnerId: string;
    gameNum: number;
    entrant1Score: number;
    entrant2Score: number;
};

export type StartggPhaseGroupNode = {
    id: string;
    displayIdentifier?: string | null;
    bracketType?: string | null;
    phaseId: string;
    phaseName?: string | null;
    sets: StartggSetNode[];
};

export type StartggPhaseNode = {
    id: string;
    name: string;
    seeds: StartggSeedNode[];
    phaseGroups: StartggPhaseGroupNode[];
};

export type StartggEventNode = {
    id: string;
    name: string;
    slug: string;
    tournament?: StartggTournamentRef | null;
    phases: Array<{
        id: string;
        name: string;
    }>;
};

export type StartggEventSnapshot = {
    id: string;
    name: string;
    slug: string;
    tournament?: StartggTournamentRef | null;
    entrants: StartggEntrantNode[];
    phases: StartggPhaseNode[];
};
