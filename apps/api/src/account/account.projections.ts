import {
    AccountPermissionsDto,
    AccountProfileDto,
    AdminAccountDto,
} from '@tournament-hub/contracts';
import { Account } from '@tournament-hub/persistence';

export function accountProfile(account: Account): AccountProfileDto {
    return {
        id: account.id,
        username: account.username,
        grooveStatsApi: account.grooveStatsApi,
        profilePicture: account.profilePicture,
        player: account.player ?? null,
    };
}

export function adminAccount(account: Account): AdminAccountDto {
    return {
        id: account.id,
        username: account.username,
        isAdmin: account.isAdmin,
        isTournamentCreator: account.isTournamentCreator,
    };
}

export function accountPermissions(account: Pick<Account, 'isAdmin' | 'isTournamentCreator'> | null): AccountPermissionsDto {
    return {
        isAdmin: account?.isAdmin ?? false,
        isTournamentCreator: account?.isTournamentCreator ?? false,
    };
}
