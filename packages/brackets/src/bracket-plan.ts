import type { BracketType } from './bracket-type';


export type BracketRoundKind = 'single' | 'winners' | 'losers' | 'final';

export type BracketMatchDescriptor = {
    kind: BracketRoundKind;
    roundIndex: number;
    roundCount: number;
    matchIndex: number;
    matchCount: number;
};

export type BracketMatchNamer = (descriptor: BracketMatchDescriptor) => string;

export type BracketPlanMatch = {
    localId: string;
    name: string;
    round: string;
};

export type BracketPlanRoute = {
    sourceMatchLocalId: string;
    sourcePlacement: number;
    targetMatchLocalId: string;
    targetSlot: number;
};

export type BracketPlanSeat = {
    matchLocalId: string;
    slot: number;
    seedIndex: number;
};

export type BracketPlan = {
    bracketType: BracketType;
    playerPerMatch: number;
    entrantCount: number;
    byes: number;
    matches: BracketPlanMatch[];
    routes: BracketPlanRoute[];
    seats: BracketPlanSeat[];
};

export type BracketPlanInput = {
    entrantCount: number;
    playerPerMatch?: number;
    name?: BracketMatchNamer;
};

export const defaultMatchName: BracketMatchNamer = (descriptor) => {
    const number = descriptor.matchIndex + 1;
    const side = descriptor.kind === 'winners' ? 'Winners ' : descriptor.kind === 'losers' ? 'Losers ' : '';

    if (descriptor.kind === 'final') {
        return descriptor.matchCount === 1 ? 'Grand Final' : `Final ${number}`;
    }
    if (descriptor.matchCount === 1) {
        return descriptor.kind === 'single' ? 'Grand Final' : `${side}Final`;
    }
    if (descriptor.kind === 'single' && descriptor.matchCount === 2) {
        return `Semifinal ${number}`;
    }
    if (descriptor.kind === 'single' && descriptor.matchCount === 4) {
        return `Quarter ${number}`;
    }

    return `${side}Round ${descriptor.roundIndex + 1} Match ${number}`;
};

export function nextPow2(value: number): number {
    let power = 1;
    while (power < value) {
        power *= 2;
    }

    return power;
}
