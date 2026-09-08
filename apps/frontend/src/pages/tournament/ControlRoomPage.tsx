import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useTournamentPageContext } from "@/features/tournament/model/TournamentPageContext";
import { useArchivedSchedules, useSchedules } from "@/features/schedule/model/useSchedules";
import { summarizeSchedule } from "@/features/schedule/model/scheduleSummary";
import { scheduleStaleMessage } from "@/features/schedule/model/scheduleStatus";
import ScheduleSwitcher from "@/features/schedule/ui/ScheduleSwitcher";
import ControlRoomSchedulePanel from "@/features/control-room/ui/ControlRoomSchedulePanel";
import ControlRoomEditor from "@/features/control-room/ui/ControlRoomEditor";
import CreateScheduleModal from "@/features/control-room/ui/CreateScheduleModal";
import StatusIcon from "@/shared/components/ui/StatusIcon";
import { btnPrimary, btnSecondary } from "@/styles/buttonStyles";

export default function ControlRoomPage() {
    const { tournamentId, divisions, controls } = useTournamentPageContext();
    const room = useSchedules(tournamentId);
    const [showArchived, setShowArchived] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
    const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);

    const archived = useArchivedSchedules(tournamentId, showArchived);
    const visible = useMemo(
        () => (showArchived ? [...room.schedules, ...(archived.data ?? [])] : room.schedules),
        [showArchived, room.schedules, archived.data],
    );
    const summaries = useMemo(() => visible.map((schedule) => summarizeSchedule(schedule)), [visible]);
    const selected = visible.find((schedule) => schedule.id === selectedScheduleId) ?? operationalFirst(visible) ?? null;
    const waitingElsewhere = visible.filter((schedule) => schedule.staleCode && schedule.id !== selected?.id);

    if (!controls) {
        return <p className="text-sm text-ui-text-mute">Control Room is available to tournament staff.</p>;
    }

    return (
        <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btnPrimary} disabled={room.pending} onClick={() => setCreating(true)}>
                    New schedule
                </button>
                <button type="button" className={`${btnSecondary} ml-auto`} onClick={() => setShowArchived((value) => !value)}>
                    {showArchived ? "Hide archived" : "Show archived"}
                </button>
            </div>

            {room.query.isLoading ? (
                <p className="text-sm text-ui-text-mute">Loading Control Room…</p>
            ) : room.query.isError ? (
                <p className="text-sm text-state-failed">Unable to load the Control Room.</p>
            ) : visible.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ui-border-strong py-12 text-center text-sm text-ui-text-mute">No schedules yet.</p>
            ) : (
                <>
                    <ScheduleSwitcher summaries={summaries} selectedId={selected?.id ?? null} onSelect={setSelectedScheduleId} />

                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
                        <div className="min-w-0">
                            {selected && (
                                <ControlRoomSchedulePanel
                                    key={selected.id}
                                    schedule={selected}
                                    tournamentId={tournamentId}
                                    divisions={divisions}
                                    busy={room.pending}
                                    onEdit={() => setEditingScheduleId(selected.id)}
                                    onStart={() => room.start(selected.id)}
                                    onStop={() => room.stop(selected.id)}
                                    onArchive={() => room.archive(selected.id)}
                                    onUnarchive={() => room.unarchive(selected.id)}
                                    onStartFrom={(entryId) => room.startFrom(selected.id, entryId)}
                                    onUpdateEntryTime={(entryId, minutes) => room.updateEntryTime(selected.id, entryId, minutes)}
                                />
                            )}
                        </div>

                        <div className="flex min-w-0 flex-col gap-4">
                            {waitingElsewhere.length > 0 && (
                                <section className="rounded-xl border border-state-pending/40 bg-state-pending/10 p-4">
                                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ui-text-mute">
                                        <StatusIcon status="pending" />
                                        Needs you elsewhere
                                    </h3>
                                    <ul className="mt-3 flex flex-col gap-3">
                                        {waitingElsewhere.map((schedule) => (
                                            <li key={schedule.id}>
                                                <p className="text-sm font-bold text-ui-text">{schedule.name}</p>
                                                <p className="mt-0.5 text-xs leading-5 text-ui-text-soft">{scheduleStaleMessage(schedule)}</p>
                                                <button type="button" className={`${btnSecondary} mt-2 text-xs`} onClick={() => setSelectedScheduleId(schedule.id)}>
                                                    Go to {schedule.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <section className="rounded-xl border border-ui-border bg-ui-raised p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-ui-text-mute">Tournament tools</h3>
                                <p className="mt-3 text-xs text-ui-text-mute">
                                    The whole tournament, side by side, is on the{" "}
                                    <Link className="underline" to={`/tournament/${tournamentId}/schedule`}>
                                        Schedule
                                    </Link>{" "}
                                    page.
                                </p>
                            </section>
                        </div>
                    </div>
                </>
            )}

            <ControlRoomEditor
                scheduleId={editingScheduleId}
                onClose={() => setEditingScheduleId(null)}
                onSave={async (scheduleId, version, entries, name, willStartAt, original) => {
                    await room.replaceEntries(scheduleId, version, entries);
                    if (name !== original.name || willStartAt !== original.willStartAt) await room.update(scheduleId, name, willStartAt);
                }}
                onDelete={room.remove}
            />
            <CreateScheduleModal tournamentId={tournamentId} open={creating} onClose={() => setCreating(false)} onCreate={room.create} />
        </div>
    );
}

function operationalFirst<T extends { status: string }>(schedules: T[]): T | undefined {
    return schedules.find((schedule) => schedule.status === "running") ?? schedules[0];
}
