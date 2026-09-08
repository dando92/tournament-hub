
export type ControlRoomSessionDto = {
    tournamentId: number;
    name: string;
    status: 'open' | 'closed';
};

export type PlayPlanPlayerDto = {
    id: number;
    name: string;
};

export type PlayPlanSongDto = {
    songId: number;
    title: string;
};

export type PlayPlanMatchDto = {
    id: string;
    name: string;
    players: PlayPlanPlayerDto[];
    songs: PlayPlanSongDto[];
};

export type PlayPlanLaneDto = {
    scheduleId: number;
    name: string;
    current: PlayPlanMatchDto | null;
};

export type PlayPlanDto = {
    version: string;
    lanes: PlayPlanLaneDto[];
};

export type ReportedRunDto = {
    playerId: number;
    score: number;
    exScore: number;
    isFailed: boolean;
};

export type ReportRunsRequestDto = {
    submissionId: string;
    songId: number;
    runs: ReportedRunDto[];
};

export type RunOutcomeReason = 'unknown-player' | 'no-waiting-round';

export type RunOutcomeDto = {
    playerId: number;
    recorded: boolean;
    applied: boolean;
    reason: RunOutcomeReason | null;
};

export type ReportRunsResultDto = {
    submissionId: string;
    duplicate: boolean;
    planVersion: string;
    planEtag: string;
    runs: RunOutcomeDto[];
};
