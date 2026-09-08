import type { BracketPlan, BracketPlanInput } from './bracket-plan';
import { BracketPlanBuilder } from './bracket-plan-builder';
import type { BracketGenerator } from './bracket-generator';

export class Manual implements BracketGenerator {
    readonly type = 'Manual' as const;

    generate(input: BracketPlanInput): BracketPlan {
        const playerPerMatch = input.playerPerMatch ?? 2;
        if (playerPerMatch < 2) {
            throw new Error(`A match holds at least two players, got ${playerPerMatch}`);
        }

        const builder = new BracketPlanBuilder(input.name ?? ((descriptor) => `Match ${descriptor.matchIndex + 1}`));
        const matchCount = Math.ceil(input.entrantCount / playerPerMatch);
        const matches = builder.addRound('single', 0, 1, matchCount, 'Round 1');
        builder.seatFirstWave(matches, input.entrantCount, playerPerMatch);

        return builder.build(this.type, input.entrantCount, playerPerMatch, matchCount * playerPerMatch - input.entrantCount);
    }
}
