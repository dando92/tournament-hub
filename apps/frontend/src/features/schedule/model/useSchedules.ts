import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "@/features/schedule/api/schedule.api";
import { scheduleKeys } from "@/features/schedule/api/schedule.keys";
import { usePageNotices } from "@/shared/context/PageNoticeContext";
import type { ScheduleEditorDto, ScheduleDto, ScheduleEntryInputDto } from "@tournament-hub/contracts";

export function useSchedules(tournamentId: number) {
    const queryClient = useQueryClient();
    const { report, dismiss } = usePageNotices();
    const schedules = useQuery({
        queryKey: scheduleKeys.list(tournamentId, false),
        queryFn: () => api.listSchedules(tournamentId),
    });

    const invalidate = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: scheduleKeys.all(tournamentId) }),
        queryClient.invalidateQueries({ queryKey: scheduleKeys.activity(tournamentId) }),
    ]);

    const mutate = useMutation({
        mutationFn: async (work: () => Promise<void>) => work(),
        onSuccess: () => {
            dismiss("Unable to update the schedule.");
            return invalidate();
        },
        onError: (error) => {
            console.error("Schedule command failed", error);
            report("Unable to update the schedule.");
        },
    });

    const run = (work: () => Promise<void>) => mutate.mutateAsync(work);

    return {
        query: schedules,
        schedules: schedules.data ?? [],
        pending: mutate.isPending,
        create: async (input: { name: string; willStartAt: string; defaultExpectedDurationMinutes: number; matchIds: number[] }) => {
            await api.createSchedule(tournamentId, input);
            await Promise.all([
                invalidate(),
                queryClient.invalidateQueries({ queryKey: scheduleKeys.creation(tournamentId) }),
            ]);
        },
        update: (scheduleId: number, name: string, willStartAt: string) => run(() => api.updateSchedule(scheduleId, name, willStartAt)),
        remove: (scheduleId: number) => run(() => api.deleteSchedule(scheduleId)),
        replaceEntries: (scheduleId: number, version: number, entries: ScheduleEntryInputDto[]) => run(() => api.replaceEntries(scheduleId, version, entries)),
        updateEntryTime: async (scheduleId: number, entryId: number, expectedDurationMinutes: number) => {
            try {
                await api.updateEntryTime(scheduleId, entryId, expectedDurationMinutes);
                queryClient.setQueryData<ScheduleDto[]>(scheduleKeys.list(tournamentId, false), (current) =>
                    current?.map((schedule) => schedule.id === scheduleId
                        ? { ...schedule, entries: schedule.entries.map((entry) => entry.id === entryId ? { ...entry, expectedDurationMinutes } : entry) }
                        : schedule),
                );
                queryClient.setQueryData<ScheduleEditorDto>(scheduleKeys.editor(scheduleId), (current) => current
                    ? { ...current, schedule: { ...current.schedule, entries: current.schedule.entries.map((entry) => entry.id === entryId ? { ...entry, expectedDurationMinutes } : entry) } }
                    : current,
                );
                dismiss("Unable to update the expected duration.");
            } catch (error) {
                console.error("Schedule timing update failed", error);
                report("Unable to update the expected duration.");
                throw error;
            }
        },
        start: (scheduleId: number) => run(() => api.startSchedule(scheduleId)),
        stop: (scheduleId: number) => run(() => api.stopSchedule(scheduleId)),
        archive: (scheduleId: number) => run(() => api.archiveSchedule(scheduleId)),
        unarchive: (scheduleId: number) => run(() => api.unarchiveSchedule(scheduleId)),
        startFrom: (scheduleId: number, entryId: number) => run(() => api.startScheduleFromEntry(scheduleId, entryId)),
    };
}

export function useArchivedSchedules(tournamentId: number, enabled: boolean) {
    return useQuery({
        queryKey: scheduleKeys.list(tournamentId, true),
        queryFn: () => api.listSchedules(tournamentId, true),
        enabled,
    });
}

export function useScheduleActivity(tournamentId?: number) {
    return useQuery({
        queryKey: scheduleKeys.activity(tournamentId ?? 0),
        queryFn: () => api.getScheduleActivity(tournamentId ?? 0),
        enabled: Boolean(tournamentId),
    });
}

export function useManualMatchActivationAllowed(tournamentId?: number): boolean {
    const activity = useScheduleActivity(tournamentId);

    return !activity.data?.running;
}
