import axios from "axios";
import type { ParticipantImportPreviewRowDto } from "@tournament-hub/contracts";
import { Participant } from "@/features/participant/model/types";

export type ParticipantImportPreviewEntry = ParticipantImportPreviewRowDto;

export async function listParticipants(tournamentId: number): Promise<Participant[]> {
  const response = await axios.get<Participant[]>(`tournaments/${tournamentId}/participants`);
  return response.data;
}

export async function createParticipant(
  tournamentId: number,
  payload: { playerId?: number; playerName?: string },
): Promise<number> {
  const response = await axios.post<{ id: number }>(`tournaments/${tournamentId}/participants`, payload);
  return response.data.id;
}

export async function removeParticipant(tournamentId: number, participantId: number): Promise<void> {
  await axios.delete(`tournaments/${tournamentId}/participants/${participantId}`);
}

export async function makeParticipantStaff(tournamentId: number, participantId: number): Promise<void> {
  await axios.post(`tournaments/${tournamentId}/participants/${participantId}/staff`);
}

export async function removeParticipantStaff(tournamentId: number, participantId: number): Promise<void> {
  await axios.delete(`tournaments/${tournamentId}/participants/${participantId}/staff`);
}

export async function previewParticipantImport(
  tournamentId: number,
  playerNames: string[],
): Promise<ParticipantImportPreviewEntry[]> {
  const response = await axios.post<ParticipantImportPreviewEntry[]>(
    `tournaments/${tournamentId}/participants/import-preview`,
    { playerNames },
  );
  return response.data;
}

export async function importParticipants(
  tournamentId: number,
  entries: Array<{ name: string; playerId?: number }>,
): Promise<number[]> {
  const response = await axios.post<Array<{ id: number }>>(
    `tournaments/${tournamentId}/participants/import`,
    { entries },
  );
  return response.data.map((participant) => participant.id);
}

export async function listAvailableParticipantsForDivision(divisionId: number): Promise<Participant[]> {
  const response = await axios.get<Participant[]>(`divisions/${divisionId}/available-participants`);
  return response.data;
}

export async function addParticipantsToDivision(divisionId: number, participantIds: number[]): Promise<void> {
  await axios.post(`divisions/${divisionId}/participants`, { participantIds });
}

export async function removeParticipantsFromDivision(divisionId: number, participantIds: number[]): Promise<void> {
  await axios.delete(`divisions/${divisionId}/participants`, { data: { participantIds } });
}
