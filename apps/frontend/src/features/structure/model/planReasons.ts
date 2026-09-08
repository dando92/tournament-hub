
const REF = /\b((?:phase|pool|match|division):-?\d+)\b/;

export type ReasonPiece = { text: string; ref?: string };

export function refsIn(reason: string): string[] {
    return spellReason(reason).flatMap((piece) => (piece.ref ? [piece.ref] : []));
}

export function spellReason(reason: string): ReasonPiece[] {
    return reason
        .split(new RegExp(REF.source, "g"))
        .map((piece, index) => (index % 2 === 1 ? { text: piece, ref: piece } : { text: piece }))
        .filter((piece) => piece.ref !== undefined || piece.text.length > 0);
}
