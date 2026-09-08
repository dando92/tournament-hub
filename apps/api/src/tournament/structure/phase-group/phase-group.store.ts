import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsRelations, Repository } from 'typeorm';
import { Match, Phase, PhaseGroup, PhaseGroupEntrant } from '@tournament-hub/persistence';

import { PhaseGroupAggregate } from '@tournament/structure/phase-group/phase-group.aggregate';

const PHASE_GROUP_GRAPH: FindOptionsRelations<PhaseGroup> = {
    phase: { division: { tournament: true } },
    entrants: { entrant: true, sourceAdvancementRule: true },
    matches: { entrants: { participants: { player: true } }, matchResult: true },
};

@Injectable()
export class PhaseGroupStore {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(PhaseGroup)
        private readonly phaseGroups: Repository<PhaseGroup>,
        @InjectRepository(Phase)
        private readonly phases: Repository<Phase>,
        @InjectRepository(Match)
        private readonly matches: Repository<Match>,
    ) {}

    async load(id: number): Promise<PhaseGroupAggregate | null> {
        const phaseGroup = await this.phaseGroups.findOne({ where: { id }, relations: PHASE_GROUP_GRAPH });

        return phaseGroup ? PhaseGroupAggregate.of(phaseGroup) : null;
    }

    async loadOrFail(id: number): Promise<PhaseGroupAggregate> {
        const phaseGroup = await this.load(id);
        if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${id} not found`);

        return phaseGroup;
    }

    async loadPhase(id: number): Promise<Phase> {
        const phase = await this.phases.findOne({
            where: { id },
            relations: { division: { tournament: true }, phaseGroups: true },
        });
        if (!phase) throw new NotFoundException(`Phase with ID ${id} not found`);

        return phase;
    }

    async countInPhase(phaseId: number): Promise<number> {
        return this.phaseGroups.countBy({ phase: { id: phaseId } });
    }

    async findEmptySolePool(phaseId: number): Promise<PhaseGroup | null> {
        const pools = await this.phaseGroups.findBy({ phase: { id: phaseId } });
        if (pools.length !== 1) return null;

        const matches = await this.matches.countBy({ phaseGroup: { id: pools[0].id } });

        return matches === 0 ? pools[0] : null;
    }

    async save(phaseGroup: PhaseGroupAggregate): Promise<void> {
        const removals = phaseGroup.removals;

        await this.dataSource.transaction(async (manager) => {
            if (removals.length > 0) await manager.delete(PhaseGroupEntrant, removals);
            await manager.save(PhaseGroup, phaseGroup.entity);
        });

        phaseGroup.settle();
    }

    async remove(phaseGroup: PhaseGroupAggregate): Promise<void> {
        await this.phaseGroups.delete(phaseGroup.id);
    }
}
