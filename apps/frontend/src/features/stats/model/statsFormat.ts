import type { DivisionPlacementRowDto } from '@tournament-hub/contracts';

export function placementLabel(row: Pick<DivisionPlacementRowDto, 'placement' | 'sharedThrough'>): string {
    return row.placement === row.sharedThrough ? String(row.placement) : `${row.placement}-${row.sharedThrough}`;
}

export function seedSwing(row: Pick<DivisionPlacementRowDto, 'placement' | 'seedNum'>): number | null {
    return row.seedNum === null ? null : row.seedNum - row.placement;
}

export function percentage(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(2)}%`;
}

export function decimal(value: number | null, digits = 2): string {
    return value === null ? '—' : value.toFixed(digits);
}

export function share(part: number, whole: number): string {
    return whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;
}
