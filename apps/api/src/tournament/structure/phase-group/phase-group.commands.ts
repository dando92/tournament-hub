import { BadRequestException, Injectable } from '@nestjs/common';
import { Entrant } from '@tournament-hub/persistence';

import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { PhaseGroupAggregate, PhaseGroupDetails } from '@tournament/structure/phase-group/phase-group.aggregate';
import { PhaseGroupStore } from '@tournament/structure/phase-group/phase-group.store';
import { StructureVersionStore } from '@tournament/structure/structure-version.store';

@Injectable()
export class PhaseGroupCommands {
    constructor(
        private readonly store: PhaseGroupStore,
        private readonly publisher: UiUpdatePublisher,
        private readonly versions: StructureVersionStore,
    ) {}

    async create(phaseId: number, details: PhaseGroupDetails): Promise<number> {
        const phase = await this.store.loadPhase(phaseId);
        const phaseGroup = PhaseGroupAggregate.create(details, phase);

        await this.store.save(phaseGroup);
        await this.versions.bump(phaseGroup.address.divisionId);
        await this.publisher.emitPhaseUpdate(phaseGroup.phaseAddress);
        await this.publisher.emitPhaseGroupUpdate(phaseGroup.address);

        return phaseGroup.id;
    }

    async update(phaseGroupId: number, details: PhaseGroupDetails): Promise<void> {
        const phaseGroup = await this.store.loadOrFail(phaseGroupId);
        phaseGroup.describe(details);

        await this.store.save(phaseGroup);
        await this.versions.bump(phaseGroup.address.divisionId);
        await this.publisher.emitPhaseUpdate(phaseGroup.phaseAddress);
        await this.publisher.emitPhaseGroupUpdate(phaseGroup.address);
    }

    async delete(phaseGroupId: number): Promise<void> {
        const phaseGroup = await this.store.load(phaseGroupId);
        if (!phaseGroup) return;

        const phaseAddress = phaseGroup.phaseAddress;
        if (await this.store.countInPhase(phaseAddress.phaseId) <= 1) {
            throw new BadRequestException('A phase keeps at least one pool. Delete the phase instead.');
        }

        await this.store.remove(phaseGroup);
        await this.versions.bump(phaseAddress.divisionId);
        await this.publisher.emitPhaseUpdate(phaseAddress);
    }

    async createForBracket(phaseId: number, bracketType: string): Promise<number> {
        const reusable = await this.store.findEmptySolePool(phaseId);
        if (!reusable) return this.create(phaseId, { bracketType });

        await this.update(reusable.id, { bracketType });

        return reusable.id;
    }

    async seatEntrants(phaseGroupId: number, entrants: Entrant[]): Promise<void> {
        const phaseGroup = await this.store.loadOrFail(phaseGroupId);
        phaseGroup.seat(entrants);

        await this.store.save(phaseGroup);
        await this.publisher.emitPhaseGroupUpdate(phaseGroup.address);
    }
}
