import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BracketGeneratorProvider, type BracketPlan, type BracketType } from '@tournament-hub/brackets';
import type { Entrant } from '@tournament-hub/persistence';
import type { ScoringSystemType } from '@tournament-hub/scoring';

import { MatchCommands } from '@match/match.commands';
import { AdvancementRuleStore } from '@tournament/structure/advancement/advancement-rule.store';
import { PhaseGroupCommands } from '@tournament/structure/phase-group/phase-group.commands';

export type GenerateBracketCommand = {
    phaseGroupId: number;
    entrants: Entrant[];
    bracketType: string;
    playerPerMatch: number;
    scoringSystem: ScoringSystemType;
};

@Injectable()
export class BracketCommands {
    private readonly generators = new BracketGeneratorProvider();

    constructor(
        @Inject()
        private readonly matchCommands: MatchCommands,
        @Inject()
        private readonly advancementRules: AdvancementRuleStore,
        @Inject()
        private readonly phaseGroupCommands: PhaseGroupCommands,
    ) {}

    getAll(): BracketType[] {
        return this.generators.getAll();
    }

    assertKnown(bracketType: string): void {
        if (!this.generators.getGenerator(bracketType)) {
            throw new BadRequestException(`Unknown bracket type ${bracketType}`);
        }
    }

    async generate(command: GenerateBracketCommand): Promise<void> {
        this.assertKnown(command.bracketType);
        const generator = this.generators.getGenerator(command.bracketType)!;

        const plan = generator.generate({ entrantCount: command.entrants.length, playerPerMatch: command.playerPerMatch });

        await this.phaseGroupCommands.seatEntrants(command.phaseGroupId, command.entrants);
        await this.write(plan, command);
    }

    private async write(plan: BracketPlan, command: GenerateBracketCommand): Promise<void> {
        const entrantIdsByMatch = new Map<string, number[]>();
        for (const seat of [...plan.seats].sort((left, right) => left.slot - right.slot)) {
            const entrant = command.entrants[seat.seedIndex];
            if (!entrant) {
                continue;
            }
            entrantIdsByMatch.set(seat.matchLocalId, [...(entrantIdsByMatch.get(seat.matchLocalId) ?? []), entrant.id]);
        }

        const matchIds = new Map<string, number>();
        for (const match of plan.matches) {
            const matchId = await this.matchCommands.create({
                name: match.name,
                phaseGroupId: command.phaseGroupId,
                scoringSystem: command.scoringSystem,
                entrantIds: entrantIdsByMatch.get(match.localId) ?? [],
            });
            matchIds.set(match.localId, matchId);
        }

        for (const route of plan.routes) {
            await this.advancementRules.createMatchToMatchRule(
                matchIds.get(route.sourceMatchLocalId)!,
                route.sourcePlacement,
                matchIds.get(route.targetMatchLocalId)!,
                route.targetSlot,
            );
        }
    }
}
