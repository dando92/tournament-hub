import type {
    EntrantStatus,
    EntrantType,
    ParticipantRole,
    ParticipantStatus,
} from './vocabulary';


export type CreatedResourceDto = {
    id: number;
};

export type PlayerRefDto = {
    id: number;
    playerName: string;
    nationality: string;
};

export type ParticipantDto = {
    id: number;
    roles: ParticipantRole[];
    status: ParticipantStatus;
    player: PlayerRefDto;
};

export type EntrantDto = {
    id: number;
    name: string;
    type: EntrantType;
    status: EntrantStatus;
    participants: ParticipantDto[];
};

export type SongRefDto = {
    id: number;
    title: string;
};

export type ScoreDto = {
    id: number;
    percentage: number;
    isFailed: boolean;
};
