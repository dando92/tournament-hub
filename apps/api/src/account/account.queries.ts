import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
    AccountPermissionsDto,
    AccountProfileDto,
    AdminAccountDto,
} from '@tournament-hub/contracts';
import { Account } from '@tournament-hub/persistence';
import {
    accountPermissions,
    accountProfile,
    adminAccount,
} from '@account/account.projections';

export type AccountCredentials = Pick<
    Account,
    'id' | 'username' | 'password' | 'isAdmin' | 'isTournamentCreator'
>;

@Injectable()
export class AccountQueries {
    constructor(
        @InjectRepository(Account)
        private readonly accounts: Repository<Account>,
    ) {}

    async allForAdministration(): Promise<AdminAccountDto[]> {
        const accounts = await this.accounts.find({
            select: { id: true, username: true, isAdmin: true, isTournamentCreator: true },
        });
        return accounts.map(adminAccount);
    }

    async profile(accountId: string): Promise<AccountProfileDto> {
        const account = await this.accounts.findOne({
            where: { id: accountId },
            relations: { player: true },
        });
        if (!account) throw new NotFoundException(`Account ${accountId} not found`);

        return accountProfile(account);
    }

    async permissions(accountId: string): Promise<AccountPermissionsDto> {
        const account = await this.accounts.findOne({
            where: { id: accountId },
            select: { isAdmin: true, isTournamentCreator: true },
        });
        return accountPermissions(account);
    }

    credentials(username: string): Promise<AccountCredentials | null> {
        return this.accounts.findOne({
            where: { username: username.toLowerCase() },
            select: {
                id: true,
                username: true,
                password: true,
                isAdmin: true,
                isTournamentCreator: true,
            },
        });
    }
}
