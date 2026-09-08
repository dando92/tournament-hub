import type { AdvancementRuleDto, MatchSummaryDto, ScheduleDto } from "@tournament-hub/contracts";

import { buildScheduleTimeline, type ScheduleTimelineEntry, type ScheduleTimelineModel } from "@/features/schedule/model/scheduleTiming";
import { toOrdinal } from "@/shared/utils";

const MINIMUM_BLOCK_HEIGHT_PX = 44;

export const LINEUP_BLOCK_HEIGHT_PX = 72;

export const DETAILED_BLOCK_HEIGHT_PX = 116;

const TICK_INTERVAL_MS = 30 * 60_000;

const TRAILING_MS = 15 * 60_000;

const COMPRESSIBLE_GAP_MS = 45 * 60_000;

const GAP_HEIGHT_PX = 44;

const MAXIMUM_PIXELS_PER_MINUTE = 8;

export type ScheduleBlockState = "completed" | "playing" | "waiting" | "upcoming";

export type ScheduleBlockDensity = "minimal" | "lineup" | "detailed";

export type ScheduleBoardBlock = {
    entry: ScheduleTimelineEntry;
    state: ScheduleBlockState;
    current: boolean;
    startMs: number;
    endMs: number;
    top: number;
    height: number;
};

export type ScheduleBoardColumn = {
    schedule: ScheduleDto;
    timeline: ScheduleTimelineModel;
    blocks: ScheduleBoardBlock[];
};

export type ScheduleBoardGap = {
    fromMs: number;
    toMs: number;
    top: number;
    height: number;
};

export type ScheduleBoardModel = {
    columns: ScheduleBoardColumn[];
    ticks: Array<{ atMs: number; top: number }>;
    gaps: ScheduleBoardGap[];
    pixelsPerMinute: number;
    nowTop: number | null;
    height: number;
};

export function buildScheduleBoard(schedules: ScheduleDto[], basePixelsPerMinute: number, now = new Date()): ScheduleBoardModel {
    const nowMs = now.getTime();
    const columns = schedules.map((schedule) => toColumn(schedule, nowMs, now));
    const spans = columns.flatMap((column) => column.blocks.map((block) => [block.startMs, block.endMs] as const));
    const earliest = spans.length > 0 ? Math.min(...spans.map(([start]) => start)) : nowMs;
    const latest = spans.length > 0 ? Math.max(...spans.map(([, end]) => end)) : nowMs;
    const axisStart = floorToTick(earliest);
    const axisEnd = latest + TRAILING_MS;
    const pixelsPerMinute = scaleFor(spans, basePixelsPerMinute);
    const axis = buildAxis(spans, axisStart, axisEnd, pixelsPerMinute / 60_000);

    let height = axis.height;
    for (const column of columns) {
        let occupiedTo = 0;
        for (const block of column.blocks) {
            const top = axis.positionAt(block.startMs);
            block.height = Math.max(MINIMUM_BLOCK_HEIGHT_PX, axis.positionAt(block.endMs) - top);
            block.top = Math.max(top, occupiedTo);
            occupiedTo = block.top + block.height;
            height = Math.max(height, occupiedTo);
        }
    }

    const ticks: ScheduleBoardModel["ticks"] = [];
    for (let atMs = ceilToTick(axisStart); atMs < axisEnd; atMs += TICK_INTERVAL_MS) {
        if (axis.isCompressed(atMs)) {
            continue;
        }
        ticks.push({ atMs, top: axis.positionAt(atMs) });
    }

    const nowTop = nowMs >= axisStart && nowMs <= axisEnd ? axis.positionAt(nowMs) : null;

    return { columns, ticks, gaps: axis.gaps, pixelsPerMinute, nowTop, height };
}

export function blockDensity(height: number, wide: boolean): ScheduleBlockDensity {
    if (height < LINEUP_BLOCK_HEIGHT_PX) {
        return "minimal";
    }
    if (wide && height >= DETAILED_BLOCK_HEIGHT_PX) {
        return "detailed";
    }

    return "lineup";
}

function scaleFor(spans: ReadonlyArray<readonly [number, number]>, basePixelsPerMinute: number): number {
    const durations = spans.map(([start, end]) => (end - start) / 60_000).filter((minutes) => minutes > 0);
    if (durations.length === 0) {
        return basePixelsPerMinute;
    }

    return Math.min(MAXIMUM_PIXELS_PER_MINUTE, Math.max(basePixelsPerMinute, LINEUP_BLOCK_HEIGHT_PX / Math.min(...durations)));
}

function buildAxis(spans: ReadonlyArray<readonly [number, number]>, axisStart: number, axisEnd: number, perMs: number) {
    const segments: Array<{ startMs: number; endMs: number; top: number; height: number; compressed: boolean }> = [];
    let cursor = axisStart;
    let top = 0;

    function append(endMs: number, compressed: boolean): void {
        if (endMs <= cursor) {
            return;
        }
        const height = compressed ? GAP_HEIGHT_PX : (endMs - cursor) * perMs;
        segments.push({ startMs: cursor, endMs, top, height, compressed });
        top += height;
        cursor = endMs;
    }

    for (const [start, end] of mergeSpans(spans)) {
        if (end <= axisStart || start >= axisEnd) {
            continue;
        }
        const from = Math.max(start, axisStart);
        if (from > cursor) {
            append(from, from - cursor >= COMPRESSIBLE_GAP_MS);
        }
        append(Math.min(end, axisEnd), false);
    }
    append(axisEnd, axisEnd - cursor >= COMPRESSIBLE_GAP_MS);

    function segmentAt(atMs: number) {
        return segments.find((segment) => atMs >= segment.startMs && atMs <= segment.endMs) ?? segments[segments.length - 1] ?? null;
    }

    return {
        height: top,
        gaps: segments
            .filter((segment) => segment.compressed)
            .map((segment) => ({ fromMs: segment.startMs, toMs: segment.endMs, top: segment.top, height: segment.height })),
        positionAt(atMs: number): number {
            const segment = segmentAt(atMs);
            if (!segment) {
                return 0;
            }
            const span = segment.endMs - segment.startMs;
            return segment.top + (span > 0 ? ((atMs - segment.startMs) / span) * segment.height : 0);
        },
        isCompressed(atMs: number): boolean {
            const segment = segmentAt(atMs);
            return Boolean(segment?.compressed) && atMs > (segment?.startMs ?? 0) && atMs < (segment?.endMs ?? 0);
        },
    };
}

function mergeSpans(spans: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
    const merged: Array<[number, number]> = [];
    for (const [start, end] of [...spans].sort(([left], [right]) => left - right)) {
        const last = merged[merged.length - 1];
        if (last && start <= last[1]) {
            last[1] = Math.max(last[1], end);
            continue;
        }
        merged.push([start, end]);
    }

    return merged;
}

function toColumn(schedule: ScheduleDto, nowMs: number, now: Date): ScheduleBoardColumn {
    const timeline = buildScheduleTimeline(schedule, now);

    return {
        schedule,
        timeline,
        blocks: timeline.entries.map((entry) => {
            const current = entry.id === schedule.currentEntryId;
            const durationMs = entry.expectedDurationMinutes * 60_000;
            const startMs = new Date(entry.startedAt ?? entry.estimatedStartAt).getTime();
            const endMs = entry.completedAt
                ? new Date(entry.completedAt).getTime()
                :
                  current && entry.startedAt
                    ? Math.max(startMs + durationMs, nowMs)
                    : startMs + durationMs;

            return { entry, state: stateOf(schedule, entry, current), current, startMs, endMs, top: 0, height: 0 };
        }),
    };
}

function stateOf(schedule: ScheduleDto, entry: ScheduleTimelineEntry, current: boolean): ScheduleBlockState {
    if (entry.match.state === "completed" || entry.completedAt) {
        return "completed";
    }
    if (!current) {
        return "upcoming";
    }
    if (schedule.staleCode) {
        return "waiting";
    }

    return entry.match.active ? "playing" : "upcoming";
}

function floorToTick(atMs: number): number {
    return Math.floor(atMs / TICK_INTERVAL_MS) * TICK_INTERVAL_MS;
}

function ceilToTick(atMs: number): number {
    return Math.ceil(atMs / TICK_INTERVAL_MS) * TICK_INTERVAL_MS;
}

export type MatchLineupPreview = {
    winnerName: string | null;
    playerNames: string[];
    pendingSources: string[];
};

export function previewLineup(match: MatchSummaryDto): MatchLineupPreview {
    const playerNames = (match.entrants ?? []).flatMap((entrant) =>
        entrant.type === "player" ? [entrant.player?.playerName ?? entrant.name] : [entrant.name],
    );

    return {
        winnerName: match.winner?.playerName ?? null,
        playerNames,
        pendingSources: (match.incomingRules ?? []).slice(playerNames.length).map(sourceLabel),
    };
}

export function sourceLabel(rule: AdvancementRuleDto): string {
    return `${toOrdinal(rule.sourcePlacement)} from ${rule.sourceName ?? `${rule.sourceKind === "match" ? "Match" : "Pool"} ${rule.sourceId}`}`;
}
