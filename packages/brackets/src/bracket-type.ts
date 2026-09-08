
export const BRACKET_TYPES = ['SingleElimination', 'DoubleElimination', 'Manual'] as const;

export type BracketType = (typeof BRACKET_TYPES)[number];

const LABELS: Record<BracketType, string> = {
    SingleElimination: 'Single elimination',
    DoubleElimination: 'Double elimination',
    Manual: 'First phase only',
};

export function isBracketType(value: string): value is BracketType {
    return BRACKET_TYPES.some((type) => type === value);
}

export function bracketTypeLabel(type: BracketType): string {
    return LABELS[type];
}
