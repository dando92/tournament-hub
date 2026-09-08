import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { StructurePlan, StructurePlanAppliedDto } from '@tournament-hub/contracts';

import { StructurePlanStore } from '@tournament/structure/plan/structure-plan.store';
import { orderedForWriting, validateStructurePlan } from '@tournament/structure/plan/structure-plan.validation';
import { StructureVersionStore } from '@tournament/structure/structure-version.store';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';

const WRITABLE_KINDS = ['division', 'phase', 'phaseGroup', 'match'];

@Injectable()
export class StructurePlanCommands {
    constructor(
        private readonly store: StructurePlanStore,
        private readonly versions: StructureVersionStore,
        private readonly publisher: UiUpdatePublisher,
    ) {}

    async apply(tournamentId: number, plan: StructurePlan): Promise<StructurePlanAppliedDto> {
        if (plan.tournamentId !== tournamentId) {
            throw new BadRequestException('The plan was computed for another tournament.');
        }

        const unsupported = plan.nodes.filter((node) => !WRITABLE_KINDS.includes(node.kind) && node.action !== 'skip');
        if (unsupported.length > 0) {
            throw new BadRequestException(
                `A plan applied here carries structure only. It also carries ${[...new Set(unsupported.map((node) => node.kind))].join(', ')}.`,
            );
        }

        const errors = validateStructurePlan(plan);
        const ordering = orderedForWriting(plan);
        const reasons = [...errors, ...ordering.errors];
        if (reasons.length > 0) {
            throw new BadRequestException(reasons);
        }

        await this.assertBasisIsCurrent(plan);

        const applied = await this.store.apply(tournamentId, plan, ordering.nodes);

        await this.publisher.emitTournamentUpdate(tournamentId);

        return { tournamentId, rowIdByLocalId: applied.rowIdByLocalId };
    }

    private async assertBasisIsCurrent(plan: StructurePlan): Promise<void> {
        if (plan.basedOn.length === 0) {
            return;
        }

        const current = await this.versions.versionsOf(plan.basedOn.map((basis) => basis.divisionId));
        const moved = plan.basedOn.filter((basis) => current.get(basis.divisionId) !== basis.structureVersion);
        if (moved.length === 0) {
            return;
        }

        throw new ConflictException(
            `The structure changed while this plan was open: ${moved
                .map((basis) => `division ${basis.divisionId}`)
                .join(', ')}. Read it again and rebuild the plan.`,
        );
    }
}
