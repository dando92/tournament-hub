import { emptyDraft, type StructureDraft } from "@/features/structure/model/structureDraft";


const STORAGE_PREFIX = "structure_draft";

function keyOf(tournamentId: number, divisionId: number): string {
    return `${STORAGE_PREFIX}:${tournamentId}:${divisionId}`;
}

export function readStructureDraft(tournamentId: number, divisionId: number): StructureDraft | null {
    try {
        const stored = localStorage.getItem(keyOf(tournamentId, divisionId));
        if (!stored) {
            return null;
        }

        const draft = JSON.parse(stored) as StructureDraft;
        if (draft.tournamentId !== tournamentId || draft.divisionId !== divisionId) {
            return null;
        }

        return { ...emptyDraft(tournamentId, divisionId), ...draft };
    } catch {
        return null;
    }
}

export function writeStructureDraft(draft: StructureDraft): void {
    try {
        localStorage.setItem(keyOf(draft.tournamentId, draft.divisionId), JSON.stringify(draft));
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }
}

export function clearStructureDraft(tournamentId: number, divisionId: number): void {
    try {
        localStorage.removeItem(keyOf(tournamentId, divisionId));
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }
}
