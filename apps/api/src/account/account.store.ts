import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account, Player } from '@tournament-hub/persistence';

@Injectable()
export class AccountStore {
    constructor(
        @InjectRepository(Account)
        private readonly accounts: Repository<Account>,
        @InjectRepository(Player)
        private readonly players: Repository<Player>,
    ) {}

    byUsername(username: string): Promise<Account | null> {
        return this.accounts.findOneBy({ username });
    }

    byPlayerId(playerId: number): Promise<Account | null> {
        return this.accounts.findOne({
            where: { player: { id: playerId } },
            relations: { player: true },
        });
    }

    async load(accountId: string): Promise<Account> {
        const account = await this.accounts.findOneBy({ id: accountId });
        if (!account) throw new NotFoundException(`Account ${accountId} not found`);

        return account;
    }

    async loadWithPlayer(accountId: string): Promise<Account> {
        const account = await this.accounts.findOne({
            where: { id: accountId },
            relations: { player: true },
        });
        if (!account) throw new NotFoundException(`Account ${accountId} not found`);

        return account;
    }

    save(account: Account): Promise<Account> {
        return this.accounts.save(account);
    }

    savePlayer(player: Player): Promise<Player> {
        return this.players.save(player);
    }
}
