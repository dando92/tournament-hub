import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import type { ScheduleDto } from "@tournament-hub/contracts";

import { getDivisionSummary } from "@/features/division/api/division.api";
import { divisionKeys } from "@/features/division/api/division.keys";
import { getMatch } from "@/features/match/api/match.api";
import { matchKeys } from "@/features/match/api/match.keys";
import ReadOnlyMatchCard from "@/features/match/ui/ReadOnlyMatchCard";
import { formatClock } from "@/features/schedule/model/scheduleDateTime";
import { buildScheduleTimeline } from "@/features/schedule/model/scheduleTiming";
import { competitionAddressLabel, divisionIdOf } from "@/features/schedule/model/scheduleContext";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";
import { focusRing } from "@/styles/buttonStyles";

const DISMISS_DISTANCE_PX = 96;
export default function ScheduleMatchDetail({
    schedule,
    matchId,
    divisions,
    onClose,
}: {
    schedule: ScheduleDto | null;
    matchId: number | null;
    divisions: TournamentDivisionOption[];
    onClose: () => void;
}) {
    const entry = schedule ? buildScheduleTimeline(schedule).entries.find((candidate) => candidate.match.id === matchId) ?? null : null;
    const divisionId = entry ? divisionIdOf(divisions, entry.match.phaseGroupId) : null;
    const divisionQuery = useQuery({
        queryKey: divisionKeys.summary(divisionId ?? 0),
        queryFn: () => getDivisionSummary(divisionId ?? 0),
        enabled: divisionId !== null,
    });
    const matchQuery = useQuery({
        queryKey: matchKeys.byId(matchId ?? 0),
        queryFn: () => getMatch(matchId ?? 0),
        enabled: matchId !== null,
    });
    const [dragY, setDragY] = useState(0);
    const [dragging, setDragging] = useState(false);
    const gesture = useRef<{ pointerId: number; startY: number } | null>(null);

    useEffect(() => {
        setDragY(0);
        setDragging(false);
        gesture.current = null;
    }, [matchId]);

    function startDrag(event: ReactPointerEvent<HTMLDivElement>): void {
        if ((event.target as HTMLElement).closest("button")) {
            return;
        }
        gesture.current = { pointerId: event.pointerId, startY: event.clientY };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function moveDrag(event: ReactPointerEvent<HTMLDivElement>): void {
        if (gesture.current?.pointerId !== event.pointerId) {
            return;
        }
        setDragY(Math.max(0, event.clientY - gesture.current.startY));
    }

    function endDrag(event: ReactPointerEvent<HTMLDivElement>): void {
        if (gesture.current?.pointerId !== event.pointerId) {
            return;
        }
        const distance = event.clientY - gesture.current.startY;
        gesture.current = null;
        setDragging(false);
        setDragY(0);
        if (distance > DISMISS_DISTANCE_PX) {
            onClose();
        }
    }

    return (
        <Transition appear show={Boolean(entry)} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-ui-text/40" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-end justify-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="translate-y-full"
                        enterTo="translate-y-0"
                        leave="ease-in duration-150"
                        leaveFrom="translate-y-0"
                        leaveTo="translate-y-full"
                    >
                        <Dialog.Panel
                            style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined, transition: dragging ? "none" : "transform 180ms ease-out" }}
                            className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-ui-border bg-ui-surface shadow-xl sm:max-h-[80dvh] sm:w-[min(64rem,calc(100vw-3rem))]"
                        >
                            {entry && schedule && (
                                <>
                                    <div
                                        onPointerDown={startDrag}
                                        onPointerMove={moveDrag}
                                        onPointerUp={endDrag}
                                        onPointerCancel={endDrag}
                                        className="shrink-0 touch-none"
                                    >
                                        <div className="flex justify-center pb-1 pt-2">
                                            <span aria-hidden className="h-1 w-10 rounded-full bg-ui-border-strong" />
                                        </div>
                                        <div className="flex items-start gap-3 border-b border-ui-separator px-4 pb-4 pt-2 sm:px-5 sm:pb-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-semibold uppercase tracking-wider text-ui-text-mute">{schedule.name}</p>
                                                <Dialog.Title as="h2" className="mt-1 truncate text-xl font-bold text-ui-text">
                                                    {entry.match.name}
                                                </Dialog.Title>
                                                <p className="mt-1 text-xs text-ui-text-mute">{competitionAddressLabel(divisions, entry.match.phaseGroupId)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                aria-label="Close"
                                                className={`-mr-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-ui-text-mute transition-colors hover:text-ui-text sm:flex ${focusRing}`}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-ui-separator px-4 py-3 text-xs text-ui-text-mute sm:px-5">
                                        <span>
                                            Planned {formatClock(entry.plannedStartAt)} · {entry.expectedDurationMinutes} min
                                        </span>
                                        {entry.startedAt && <span className="font-semibold text-ui-text">Started {formatClock(entry.startedAt)}</span>}
                                        {entry.completedAt && <span className="font-semibold text-ui-text">Ended {formatClock(entry.completedAt)}</span>}
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
                                        {divisionQuery.data && matchQuery.data ? (
                                            <ReadOnlyMatchCard
                                                division={divisionQuery.data}
                                                match={matchQuery.data}
                                                allMatches={schedule.entries.map((item) => item.match)}
                                            />
                                        ) : (
                                            <p className="rounded-xl border border-ui-border bg-ui-raised p-8 text-center text-sm text-ui-text-mute">Loading match…</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
