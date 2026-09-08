import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tournament } from '@tournament-hub/persistence';
import { Repository } from 'typeorm';

@Injectable()
export class PlanVersionStore {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournaments: Repository<Tournament>,
    ) {}

    async bump(tournamentId: number | null | undefined): Promise<void> {
        if (!tournamentId) {
            return;
        }

        await this.tournaments.increment({ id: tournamentId }, 'planVersion', 1);
    }

    async versionOf(tournamentId: number): Promise<number> {
        const tournament = await this.tournaments.findOne({ where: { id: tournamentId }, select: { id: true, planVersion: true } });

        return tournament?.planVersion ?? 0;
    }
}
