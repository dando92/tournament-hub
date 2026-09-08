import axios from "axios";
import type { ScheduleActivityDto, ScheduleCreationDto, ScheduleEditorDto, ScheduleDto, ScheduleEntryInputDto } from "@tournament-hub/contracts";

export async function listSchedules(tournamentId: number, archived = false): Promise<ScheduleDto[]> {
    const response = await axios.get<ScheduleDto[]>(`tournaments/${tournamentId}/schedules`, { params: archived ? { archived: true } : undefined });
    return response.data;
}

export async function getScheduleActivity(tournamentId: number): Promise<ScheduleActivityDto> {
    const response = await axios.get<ScheduleActivityDto>(`tournaments/${tournamentId}/schedules/activity`);
    return response.data;
}

export async function getEditor(scheduleId: number): Promise<ScheduleEditorDto> {
    const response = await axios.get<ScheduleEditorDto>(`schedules/${scheduleId}/editor`);
    return response.data;
}

export async function getCreationData(tournamentId: number): Promise<ScheduleCreationDto> {
    const response = await axios.get<ScheduleCreationDto>(`tournaments/${tournamentId}/schedules/creation`);
    return response.data;
}

export async function createSchedule(
    tournamentId: number,
    input: { name: string; willStartAt: string; defaultExpectedDurationMinutes: number; matchIds: number[] },
): Promise<number> {
    const response = await axios.post<{ id: number }>(`tournaments/${tournamentId}/schedules`, input);
    return response.data.id;
}

export async function updateSchedule(scheduleId: number, name: string, willStartAt: string): Promise<void> {
    await axios.patch(`schedules/${scheduleId}`, { name, willStartAt });
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
    await axios.delete(`schedules/${scheduleId}`);
}

export async function replaceEntries(scheduleId: number, version: number, entries: ScheduleEntryInputDto[]): Promise<void> {
    await axios.put(`schedules/${scheduleId}/entries`, { version, entries });
}

export async function updateEntryTime(scheduleId: number, entryId: number, expectedDurationMinutes: number): Promise<void> {
    await axios.patch(`schedules/${scheduleId}/entries/${entryId}/time`, { expectedDurationMinutes });
}

async function command(scheduleId: number, action: string): Promise<void> {
    await axios.post(`schedules/${scheduleId}/${action}`);
}

export const startSchedule = (scheduleId: number) => command(scheduleId, "start");
export const stopSchedule = (scheduleId: number) => command(scheduleId, "stop");
export const archiveSchedule = (scheduleId: number) => command(scheduleId, "archive");
export async function unarchiveSchedule(scheduleId: number): Promise<void> {
    await axios.delete(`schedules/${scheduleId}/archive`);
}
export async function startScheduleFromEntry(scheduleId: number, entryId: number): Promise<void> {
    await axios.post(`schedules/${scheduleId}/start-from/${entryId}`);
}
