import { Injectable } from '@nestjs/common';

import { AccountCommands } from '@account/account.commands';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { TournamentAggregate, TournamentDetails } from '@tournament/management/tournament.aggregate';
import { TournamentStore } from '@tournament/management/tournament.store';
import { ScheduleRunner } from '@tournament/competition/schedule/schedule.runner';

export type CreateTournamentInput = TournamentDetails & {
    name: string;
    ownerAccountId?: string;
};

@Injectable()
export class TournamentCommands {
    constructor(
        private readonly store: TournamentStore,
        private readonly publisher: UiUpdatePublisher,
        private readonly accounts: AccountCommands,
        private readonly controlRoom: ScheduleRunner,
    ) {}

    async create(input: CreateTournamentInput): Promise<number> {
        const tournament = TournamentAggregate.create(input);

        if (input.ownerAccountId) {
            const account = await this.accounts.ensurePlayer(input.ownerAccountId);
            const owner = tournament.register(account.player, ['owner']);
            tournament.linkAccount(owner, account);
        }

        await this.store.save(tournament);

        return tournament.id;
    }

    async update(tournamentId: number, details: TournamentDetails): Promise<void> {
        const tournament = await this.store.loadOrFail(tournamentId);
        tournament.assertOpen();

        tournament.describe(details);

        await this.store.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }

    async close(tournamentId: number): Promise<void> {
        const tournament = await this.store.loadOrFail(tournamentId);
        const closed = tournament.close();
        if (!closed) return;

        await this.store.save(tournament);
        await this.controlRoom.stopTournament(tournamentId);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }

    async reopen(tournamentId: number): Promise<void> {
        const tournament = await this.store.loadOrFail(tournamentId);
        if (!tournament.reopen()) return;

        await this.store.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }
}
