import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getCreationData } from "@/features/schedule/api/schedule.api";
import { scheduleKeys } from "@/features/schedule/api/schedule.keys";
import { defaultScheduleStartValue, localDateTimeToIso } from "@/features/schedule/model/scheduleDateTime";
import ControlRoomMatchAssignment, { type EditableScheduleEntry } from "@/features/control-room/ui/ControlRoomMatchAssignment";
import FormModal from "@/shared/components/ui/FormModal";
import { focusRing } from "@/styles/buttonStyles";

type Props = {
    tournamentId: number;
    open: boolean;
    onClose: () => void;
    onCreate: (input: { name: string; willStartAt: string; defaultExpectedDurationMinutes: number; matchIds: number[] }) => Promise<void>;
};

export default function CreateScheduleModal({ tournamentId, open, onClose, onCreate }: Props) {
    const query = useQuery({ queryKey: scheduleKeys.creation(tournamentId), queryFn: () => getCreationData(tournamentId), enabled: open });
    const [name, setName] = useState("");
    const [willStartAt, setWillStartAt] = useState(defaultScheduleStartValue);
    const [defaultDuration, setDefaultDuration] = useState(30);
    const [assigned, setAssigned] = useState<EditableScheduleEntry[]>([]);
    const [unassigned, setUnassigned] = useState(query.data?.unassignedMatches ?? []);

    useEffect(() => {
        if (!open || !query.data) {
            return;
        }

        setName('');
        setWillStartAt(defaultScheduleStartValue());
        setDefaultDuration(30);
        setAssigned([]);
        setUnassigned(query.data.unassignedMatches);
    }, [open, query.data]);

    const validate = () => {
        const errors: string[] = [];
        if (!name.trim()) {
            errors.push('A schedule needs a name.');
        }
        if (!willStartAt) {
            errors.push('A schedule needs a start time.');
        }
        if (assigned.length === 0) {
            errors.push('Assign at least one match to the schedule.');
        }

        return errors;
    };

    const create = () =>
        onCreate({
            name: name.trim(),
            willStartAt: localDateTimeToIso(willStartAt),
            defaultExpectedDurationMinutes: defaultDuration,
            matchIds: assigned.map((entry) => entry.match.id),
        });

    return (
        <FormModal
            open={open}
            onClose={onClose}
            title="Create schedule"
            confirmText="Create schedule"
            validate={validate}
            onConfirm={create}
            failureFallback="The schedule could not be created."
            maxWidth="max-w-5xl"
            fitViewport
        >
            {query.isLoading ? (
                <p className="text-sm text-ui-text-mute">Loading available matches…</p>
            ) : query.isError ? (
                <p className="text-sm text-state-failed">Unable to prepare schedule creation.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <label className="text-sm font-semibold text-ui-text">
                            Schedule name
                            <input data-autofocus value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 block w-full rounded border border-ui-border bg-ui-canvas px-3 py-2 font-normal ${focusRing}`} />
                        </label>
                        <label className="text-sm font-semibold text-ui-text">
                            Will start at
                            <input type="datetime-local" value={willStartAt} onChange={(event) => setWillStartAt(event.target.value)} className={`mt-1 block w-full rounded border border-ui-border bg-ui-canvas px-3 py-2 font-normal ${focusRing}`} />
                        </label>
                        <label className="text-sm font-semibold text-ui-text">
                            Default match duration
                            <span className="mt-1 flex items-center gap-2">
                                <input type="number" min={1} max={1440} value={defaultDuration} onChange={(event) => setDefaultDuration(Math.max(1, Math.min(1440, Number(event.target.value))))} className={`block w-full rounded border border-ui-border bg-ui-canvas px-3 py-2 font-normal ${focusRing}`} />
                                <span className="font-normal text-ui-text-mute">min</span>
                            </span>
                        </label>
                    </div>
                    <p className="text-sm text-ui-text-mute">Drag matches into the schedule and arrange their running order. The default duration is copied to every assigned match.</p>
                    <ControlRoomMatchAssignment assigned={assigned} unassigned={unassigned} defaultExpectedDurationMinutes={defaultDuration} editableDurations={false} onAssignedChange={setAssigned} onUnassignedChange={setUnassigned} />
                </div>
            )}
        </FormModal>
    );
}
