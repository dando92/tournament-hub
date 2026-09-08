import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsRelations, In, Repository } from 'typeorm';
import { Division, Participant, Phase, Tournament } from '@tournament-hub/persistence';

import { DivisionAggregate } from '@tournament/structure/division/division.aggregate';

const DIVISION_GRAPH: FindOptionsRelations<Division> = {
    tournament: true,
    phases: true,
    entrants: { participants: { player: true } },
};

@Injectable()
export class DivisionStore {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(Division)
        private readonly divisions: Repository<Division>,
        @InjectRepository(Tournament)
        private readonly tournaments: Repository<Tournament>,
        @InjectRepository(Participant)
        private readonly participants: Repository<Participant>,
        @InjectRepository(Phase)
        private readonly phases: Repository<Phase>,
    ) {}

    async load(id: number): Promise<DivisionAggregate | null> {
        const division = await this.divisions.findOne({ where: { id }, relations: DIVISION_GRAPH });

        return division ? DivisionAggregate.of(division) : null;
    }

    async loadOrFail(id: number): Promise<DivisionAggregate> {
        const division = await this.load(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);

        return division;
    }

    async loadTournament(id: number): Promise<Tournament> {
        const tournament = await this.tournaments.findOneBy({ id });
        if (!tournament) throw new NotFoundException(`Tournament ${id} not found`);

        return tournament;
    }

    async loadParticipants(ids: number[]): Promise<Participant[]> {
        if (ids.length === 0) return [];

        const found = await this.participants.find({ where: { id: In(ids) }, relations: { player: true } });
        const byId = new Map(found.map((participant) => [participant.id, participant]));

        return ids.map((id) => {
            const participant = byId.get(id);
            if (!participant) throw new NotFoundException(`Participant ${id} not found`);

            return participant;
        });
    }

    async locatePhase(phaseId: number): Promise<number> {
        const phase = await this.phases.findOne({ where: { id: phaseId }, relations: { division: true } });
        if (!phase?.division) throw new NotFoundException(`Phase with ID ${phaseId} not found`);

        return phase.division.id;
    }

    async save(division: DivisionAggregate): Promise<void> {
        const removals = division.removals;

        await this.dataSource.transaction(async (manager) => {
            await manager.save(Division, division.entity);
            if (removals.length > 0) await manager.delete(Phase, removals);
        });

        division.settle();
    }

    async remove(division: DivisionAggregate): Promise<void> {
        await this.divisions.delete(division.id);
    }
}
