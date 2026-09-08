import { BracketGeneratorProvider, type BracketPlan, type BracketType } from "@tournament-hub/brackets";

const generators = new BracketGeneratorProvider();

export function bracketTypes(): BracketType[] {
    return generators.getAll();
}

export function generateBracket(bracketType: BracketType, entrantCount: number, playerPerMatch: number): BracketPlan {
    const generator = generators.getGenerator(bracketType);
    if (!generator) {
        throw new Error(`${bracketType} is not a bracket this can build.`);
    }

    return generator.generate({ entrantCount, playerPerMatch });
}
