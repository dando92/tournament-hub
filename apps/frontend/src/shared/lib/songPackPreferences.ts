
const STORAGE_KEY = 'songs_expanded_packs';

export function readExpandedSongPacks(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return new Set();
        }

        const parsed: unknown = JSON.parse(raw);

        return Array.isArray(parsed) ? new Set(parsed.filter((pack): pack is string => typeof pack === 'string')) : new Set();
    } catch {
        return new Set();
    }
}

export function writeExpandedSongPacks(packs: ReadonlySet<string>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...packs]));
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }
}
