import type { BracketPlan, BracketPlanInput } from './bracket-plan';
import type { BracketType } from './bracket-type';

export interface BracketGenerator {
    readonly type: BracketType;
    generate(input: BracketPlanInput): BracketPlan;
}
