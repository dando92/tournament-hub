export type SongDialogChoices = {
    mode: 'title' | 'roll';
    titlePack: string;
    rollPack: string;
    allowPlayed: boolean;
};

const STORAGE_KEY = 'song_dialog_choices';

const DEFAULTS: SongDialogChoices = { mode: 'title', titlePack: '', rollPack: '', allowPlayed: false };

export function readSongDialogChoices(tournamentId: number | undefined): SongDialogChoices {
    if (tournamentId === undefined) {
        return { ...DEFAULTS };
    }

    const stored = readStored()[String(tournamentId)] ?? {};

    return {
        mode: stored.mode === 'roll' ? 'roll' : 'title',
        titlePack: typeof stored.titlePack === 'string' ? stored.titlePack : '',
        rollPack: typeof stored.rollPack === 'string' ? stored.rollPack : '',
        allowPlayed: stored.allowPlayed === true,
    };
}

export function writeSongDialogChoice<K extends keyof SongDialogChoices>(tournamentId: number | undefined, choice: K, value: SongDialogChoices[K]): void {
    if (tournamentId === undefined) {
        return;
    }

    const stored = readStored();
    const key = String(tournamentId);
    const entry = { ...stored[key] };
    if (value === DEFAULTS[choice]) {
        delete entry[choice];
    } else {
        entry[choice] = value;
    }

    if (Object.keys(entry).length === 0) {
        delete stored[key];
    } else {
        stored[key] = entry;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }
}

export function rememberedPack(pack: string, packs: string[], fallback: string): string {
    return pack !== '' && packs.includes(pack) ? pack : fallback;
}

function readStored(): Record<string, Partial<SongDialogChoices>> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed: unknown = JSON.parse(raw);

        return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Partial<SongDialogChoices>>) : {};
    } catch {
        return {};
    }
}
