import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { genSalt, hash } from 'bcrypt';

import { AccountProfileDto, AdminAccountDto } from '@tournament-hub/contracts';
import { Account, Player } from '@tournament-hub/persistence';
import { accountProfile, adminAccount } from '@account/account.projections';
import { AccountStore } from '@account/account.store';

export type CreateAccountInput = {
    username: string;
    email: string;
    password: string;
    grooveStatsApi?: string;
    playerName?: string;
};

export type AccountProfileInput = {
    playerName?: string;
    nationality?: string;
    grooveStatsApi?: string;
    profilePicture?: string;
};

export type AccountFlagsInput = {
    isAdmin?: boolean;
    isTournamentCreator?: boolean;
};

@Injectable()
export class AccountCommands {
    constructor(private readonly store: AccountStore) {}

    async create(input: CreateAccountInput): Promise<AccountProfileDto> {
        const normalizedUsername = input.username.toLowerCase();
        if (await this.store.byUsername(normalizedUsername)) {
            throw new UnprocessableEntityException();
        }

        const player = new Player();
        player.playerName = input.playerName ?? input.username;
        await this.store.savePlayer(player);

        const account = new Account();
        account.username = normalizedUsername;
        account.email = input.email;
        account.password = await hash(input.password, await genSalt(10));
        account.grooveStatsApi = input.grooveStatsApi ?? '';
        account.player = player;

        return accountProfile(await this.store.save(account));
    }

    async ensurePlayer(accountId: string): Promise<Account> {
        const account = await this.store.loadWithPlayer(accountId);
        if (account.player) return account;

        const player = new Player();
        player.playerName = account.username;
        account.player = await this.store.savePlayer(player);

        return this.store.save(account);
    }

    async updateProfile(accountId: string, input: AccountProfileInput): Promise<AccountProfileDto> {
        const account = await this.store.loadWithPlayer(accountId);
        if (input.grooveStatsApi !== undefined) account.grooveStatsApi = input.grooveStatsApi;
        if (input.profilePicture !== undefined) account.profilePicture = input.profilePicture;
        if (account.player) {
            if (input.playerName !== undefined) account.player.playerName = input.playerName;
            if (input.nationality !== undefined) account.player.nationality = input.nationality.toUpperCase();
            await this.store.savePlayer(account.player);
        }

        return accountProfile(await this.store.save(account));
    }

    async updateFlags(accountId: string, input: AccountFlagsInput): Promise<AdminAccountDto> {
        const account = await this.store.load(accountId);
        if (input.isAdmin !== undefined) account.isAdmin = input.isAdmin;
        if (input.isTournamentCreator !== undefined) account.isTournamentCreator = input.isTournamentCreator;

        return adminAccount(await this.store.save(account));
    }
}
