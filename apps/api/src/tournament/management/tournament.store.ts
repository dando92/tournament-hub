import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsRelations, Repository } from 'typeorm';
import { Participant, Tournament } from '@tournament-hub/persistence';

import { TournamentAggregate } from '@tournament/management/tournament.aggregate';

const TOURNAMENT_GRAPH: FindOptionsRelations<Tournament> = {
    participants: { player: true, account: true },
};

@Injectable()
export class TournamentStore {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(Tournament)
        private readonly tournaments: Repository<Tournament>,
    ) {}

    async load(id: number): Promise<TournamentAggregate | null> {
        const tournament = await this.tournaments.findOne({ where: { id }, relations: TOURNAMENT_GRAPH });

        return tournament ? TournamentAggregate.of(tournament) : null;
    }

    async loadOrFail(id: number): Promise<TournamentAggregate> {
        const tournament = await this.load(id);
        if (!tournament) throw new NotFoundException(`Tournament with id ${id} not found`);

        return tournament;
    }

    async save(tournament: TournamentAggregate): Promise<void> {
        const removal = tournament.removal;

        await this.dataSource.transaction(async (manager) => {
            await manager.save(Tournament, tournament.entity);

            if (removal) {
                const stored = await manager.findOne(Participant, { where: { id: removal.id }, relations: { entrants: true } });
                if (stored) await manager.remove(Participant, stored);
            }
        });

        tournament.settle();
    }
}
