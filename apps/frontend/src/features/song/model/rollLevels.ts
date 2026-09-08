export function parseRollLevels(text: string): number[] {
    return text
        .split(/[^0-9]+/)
        .filter((part) => part.length > 0)
        .map((part) => parseInt(part, 10));
}

export function formatRollLevels(levels: number[]): string {
    return levels.join(', ');
}
