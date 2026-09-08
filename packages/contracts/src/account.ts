import type { PlayerRefDto } from './projections';

export type AccountProfileDto = {
    id: string;
    username: string;
    grooveStatsApi: string;
    profilePicture: string;
    player: PlayerRefDto | null;
};

export type AdminAccountDto = {
    id: string;
    username: string;
    isAdmin: boolean;
    isTournamentCreator: boolean;
};

export type AccountPermissionsDto = {
    isAdmin: boolean;
    isTournamentCreator: boolean;
};
