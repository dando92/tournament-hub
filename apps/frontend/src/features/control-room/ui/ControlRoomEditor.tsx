import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getEditor } from "@/features/schedule/api/schedule.api";
import { scheduleKeys } from "@/features/schedule/api/schedule.keys";
import { localDateTimeToIso, toLocalDateTimeValue } from "@/features/schedule/model/scheduleDateTime";
import ControlRoomMatchAssignment, { type EditableScheduleEntry } from "@/features/control-room/ui/ControlRoomMatchAssignment";
import FormModal from "@/shared/components/ui/FormModal";
import { btnDanger, focusRing } from "@/styles/buttonStyles";

type Props = {
    scheduleId: number | null;
    onClose: () => void;
    onSave: (
        scheduleId: number,
        version: number,
        entries: Array<{ matchId: number; expectedDurationMinutes: number }>,
        name: string,
        willStartAt: string,
        original: { name: string; willStartAt: string },
    ) => Promise<void>;
    onDelete: (scheduleId: number) => Promise<void>;
};

export default function ControlRoomEditor({ scheduleId, onClose, onSave, onDelete }: Props) {
    const query = useQuery({ queryKey: scheduleKeys.editor(scheduleId ?? 0), queryFn: () => getEditor(scheduleId ?? 0), enabled: scheduleId !== null });
    const [name, setName] = useState("");
    const [willStartAt, setWillStartAt] = useState("");
    const [assigned, setAssigned] = useState<EditableScheduleEntry[]>([]);
    const [unassigned, setUnassigned] = useState(query.data?.unassignedMatches ?? []);

    useEffect(() => {
        if (!query.data) return;
        setName(query.data.schedule.name);
        setWillStartAt(toLocalDateTimeValue(query.data.schedule.willStartAt));
        setAssigned(query.data.schedule.entries.map((entry) => ({ match: entry.match, expectedDurationMinutes: entry.expectedDurationMinutes })));
        setUnassigned(query.data.unassignedMatches);
    }, [query.data]);

    const validate = () => {
        if (!query.data) {
            return ['This schedule is not loaded yet.'];
        }

        const errors: string[] = [];
        if (!name.trim()) {
            errors.push('A schedule needs a name.');
        }
        if (!willStartAt) {
            errors.push('A schedule needs a start time.');
        }

        return errors;
    };

    const save = () =>
        onSave(
            query.data!.schedule.id,
            query.data!.schedule.version,
            assigned.map((entry) => ({ matchId: entry.match.id, expectedDurationMinutes: entry.expectedDurationMinutes })),
            name.trim(),
            localDateTimeToIso(willStartAt),
            { name: query.data!.schedule.name, willStartAt: query.data!.schedule.willStartAt },
        );

    const deleteSchedule = (
        <button
            type="button"
            className={btnDanger}
            disabled={!query.data}
            onClick={() => query.data && window.confirm(`Delete schedule "${query.data.schedule.name}"?`) && onDelete(query.data.schedule.id).then(onClose)}
        >
            Delete schedule
        </button>
    );

    return (
        <FormModal
            open={scheduleId !== null}
            onClose={onClose}
            title="Edit schedule"
            confirmText="Save schedule"
            validate={validate}
            onConfirm={save}
            leadingActions={deleteSchedule}
            failureFallback="The schedule could not be saved."
            maxWidth="max-w-5xl"
            fitViewport
        >
            {query.isLoading ? (
                <p className="text-sm text-ui-text-mute">Loading schedule…</p>
            ) : query.isError ? (
                <p className="text-sm text-state-failed">Unable to open this schedule for editing.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold text-ui-text">
                            Schedule name
                            <input data-autofocus value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 block w-full rounded border border-ui-border bg-ui-canvas px-3 py-2 font-normal ${focusRing}`} />
                        </label>
                        <label className="text-sm font-semibold text-ui-text">
                            Will start at
                            <input type="datetime-local" value={willStartAt} onChange={(event) => setWillStartAt(event.target.value)} className={`mt-1 block w-full rounded border border-ui-border bg-ui-canvas px-3 py-2 font-normal ${focusRing}`} />
                        </label>
                    </div>
                    <ControlRoomMatchAssignment assigned={assigned} unassigned={unassigned} defaultExpectedDurationMinutes={30} onAssignedChange={setAssigned} onUnassignedChange={setUnassigned} />
                </div>
            )}
        </FormModal>
    );
}
