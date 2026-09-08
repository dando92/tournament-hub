const STORAGE_KEY = 'bracket_type';

export function readBracketType(bracketTypes: string[]): string {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null && bracketTypes.includes(stored)) {
            return stored;
        }
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }

    return bracketTypes[0] ?? '';
}

export function writeBracketType(bracketType: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, bracketType);
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }
}
