import { useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleDto } from "@tournament-hub/contracts";

import { buildScheduleBoard, type ScheduleBoardColumn } from "@/features/schedule/model/scheduleBoard";
import { divisionNameOf, phaseAddressLabel } from "@/features/schedule/model/scheduleContext";
import { formatClock } from "@/features/schedule/model/scheduleDateTime";
import type { ScheduleDay } from "@/features/schedule/model/scheduleDays";
import { summarizeSchedule } from "@/features/schedule/model/scheduleSummary";
import ScheduleBoardCard from "@/features/schedule/ui/ScheduleBoardCard";
import ScheduleDaySelector from "@/features/schedule/ui/ScheduleDaySelector";
import { ScheduleSwitcherCard } from "@/features/schedule/ui/ScheduleSwitcher";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";

const DESKTOP_PIXELS_PER_MINUTE = 3.4;
const PHONE_PIXELS_PER_MINUTE = 3;
const REFRESH_INTERVAL_MS = 60_000;

const GUTTER_CLASS = "w-11 shrink-0 sm:w-14";

const COLUMN_CLASS = "w-[152px] shrink-0 sm:w-auto sm:min-w-[12rem] sm:flex-1";

export default function ScheduleBoard({
    schedules,
    divisions,
    days,
    selectedDay,
    onSelectDay,
    selectedMatchId,
    onOpenMatch,
}: {
    schedules: ScheduleDto[];
    divisions: TournamentDivisionOption[];
    days: ScheduleDay[];
    selectedDay: ScheduleDay | null;
    onSelectDay: (dayKey: string) => void;
    selectedMatchId: number | null;
    onOpenMatch: (matchId: number) => void;
}) {
    const [now, setNow] = useState(() => new Date());
    const [focusedScheduleId, setFocusedScheduleId] = useState<number | null>(null);
    const compact = useCompactViewport();
    const columnRefs = useRef(new Map<number, HTMLDivElement>());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, []);

    const summaries = useMemo(() => schedules.map((schedule) => summarizeSchedule(schedule, now)), [schedules, now]);
    const focused = schedules.some((schedule) => schedule.id === focusedScheduleId) ? focusedScheduleId : null;
    const board = useMemo(
        () =>
            buildScheduleBoard(
                focused === null ? schedules : schedules.filter((schedule) => schedule.id === focused),
                compact ? PHONE_PIXELS_PER_MINUTE : DESKTOP_PIXELS_PER_MINUTE,
                now,
            ),
        [schedules, focused, compact, now],
    );
    const dayBar = days.length > 1 ? selectedDay : null;

    useEffect(() => {
        if (focused === null) {
            return;
        }
        const anchor = columnRefs.current.get(focused)?.querySelector<HTMLElement>('[data-anchor="true"]');
        anchor?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, [focused]);

    function toggleFocus(scheduleId: number) {
        setFocusedScheduleId(scheduleId === focused ? null : scheduleId);
    }

    if (schedules.length === 0) {
        return <p className="rounded-xl border border-dashed border-ui-border-strong py-16 text-center text-sm text-ui-text-mute">No schedule has been created yet.</p>;
    }

    const headings = summaries.map((summary) => (
        <ScheduleSwitcherCard
            key={summary.schedule.id}
            summary={summary}
            selected={summary.schedule.id === focused}
            collapsed={focused !== null && summary.schedule.id !== focused}
            onSelect={() => toggleFocus(summary.schedule.id)}
            className={focused === null ? COLUMN_CLASS : summary.schedule.id === focused ? "min-w-[12rem] flex-1" : "max-w-[10rem] shrink-0"}
        />
    ));

    return (
        <div className="flex min-w-0 flex-col gap-3">
            {dayBar && (
                <div className="sticky top-0 z-30 min-w-0 bg-ui-canvas">
                    <ScheduleDaySelector days={days} selected={dayBar} onSelect={onSelectDay} />
                </div>
            )}

            {focused !== null && (
                <div className={`sticky ${dayBar ? "top-11" : "top-0"} z-20 -mx-1 flex gap-2 overflow-x-auto bg-ui-canvas px-1 pb-3 [scrollbar-width:thin] sm:gap-3`}>{headings}</div>
            )}

            <div className="min-w-0 overflow-x-auto pb-2">
                <div className={`flex flex-col ${focused === null ? "min-w-max sm:min-w-0" : "min-w-0"}`}>
                    {focused === null && (
                        <div className={`sticky ${dayBar ? "top-11" : "top-0"} z-20 flex gap-2 bg-ui-canvas pb-3 sm:gap-3`}>
                            <div className={GUTTER_CLASS} />
                            {headings}
                        </div>
                    )}

                    <div className="relative flex gap-2 sm:gap-3" style={{ height: board.height }}>
                        {board.gaps.map((gap) => (
                            <span
                                key={gap.fromMs}
                                aria-hidden
                                style={{ top: gap.top, height: gap.height }}
                                className="pointer-events-none absolute inset-x-0 border-y border-dashed border-ui-separator"
                            />
                        ))}

                        <div className={`relative ${GUTTER_CLASS}`}>
                            {board.ticks.map((tick) => (
                                <span key={tick.atMs} style={{ top: tick.top }} className="absolute right-0 -translate-y-1/2 text-[11px] font-semibold text-ui-text-mute">
                                    {formatClock(tick.atMs)}
                                </span>
                            ))}
                            {board.nowTop !== null && (
                                <span
                                    style={{ top: board.nowTop }}
                                    className="absolute right-0 z-10 -translate-y-1/2 rounded-full bg-state-live px-1.5 py-0.5 text-[10px] font-bold text-ui-surface"
                                >
                                    {formatClock(now.getTime())}
                                </span>
                            )}
                        </div>

                        {board.columns.map((column) => {
                            const anchorEntryId = anchorEntryIdOf(column);
                            const mixedDivisions = new Set(column.blocks.map((block) => divisionNameOf(divisions, block.entry.match.phaseGroupId))).size > 1;

                            return (
                                <div
                                    key={column.schedule.id}
                                    ref={(element) => {
                                        if (element) columnRefs.current.set(column.schedule.id, element);
                                        else columnRefs.current.delete(column.schedule.id);
                                    }}
                                    className={`relative border-l border-ui-separator ${focused === null ? COLUMN_CLASS : "min-w-0 flex-1"} ${
                                        column.schedule.archivedAt ? "opacity-70" : ""
                                    }`}
                                >
                                    {column.blocks.length === 0 && (
                                        <p className="absolute inset-x-0 top-0 rounded-lg border border-dashed border-ui-border-strong py-8 text-center text-xs text-ui-text-mute">
                                            No matches
                                        </p>
                                    )}
                                    {column.blocks.map((block) => (
                                        <ScheduleBoardCard
                                            key={block.entry.id}
                                            block={block}
                                            divisionName={mixedDivisions ? divisionNameOf(divisions, block.entry.match.phaseGroupId) : null}
                                            addressLabel={phaseAddressLabel(divisions, block.entry.match.phaseGroupId)}
                                            wide={focused !== null || (!compact && schedules.length === 1)}
                                            selected={block.entry.match.id === selectedMatchId}
                                            anchor={block.entry.id === anchorEntryId}
                                            onOpen={() => onOpenMatch(block.entry.match.id)}
                                        />
                                    ))}
                                </div>
                            );
                        })}

                        {board.nowTop !== null && (
                            <span aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-state-live" style={{ top: board.nowTop }} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function anchorEntryIdOf(column: ScheduleBoardColumn): number | null {
    const block = column.blocks.find((candidate) => candidate.current) ?? column.blocks.find((candidate) => candidate.state !== "completed") ?? column.blocks[0];

    return block?.entry.id ?? null;
}

function useCompactViewport(): boolean {
    const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);

    useEffect(() => {
        const query = window.matchMedia("(max-width: 639px)");
        const update = (event: MediaQueryListEvent) => setCompact(event.matches);
        query.addEventListener("change", update);
        setCompact(query.matches);
        return () => query.removeEventListener("change", update);
    }, []);

    return compact;
}
