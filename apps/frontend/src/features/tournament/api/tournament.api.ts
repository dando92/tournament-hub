import axios from "axios";
import {
  IssuedControlRoomKey,
  Tournament,
  TournamentConfiguration,
  TournamentRef,
} from "@/features/tournament/model/types";
import { TournamentOverview } from "@/features/tournament/model/types";


export type UpdateTournamentRequest = {
  name: string;
  startggApiKey: string | null;
  defaultScoringSystem: string;
};

export async function listPublicTournaments(): Promise<TournamentRef[]> {
  const response = await axios.get<TournamentRef[]>("tournaments/public");
  return response.data;
}

export async function getTournament(tournamentId: number): Promise<Tournament> {
  const response = await axios.get<Tournament>(`tournaments/${tournamentId}`);
  return response.data;
}

export async function createTournament(name: string): Promise<number> {
  const response = await axios.post<{ id: number }>("tournaments", { name });
  return response.data.id;
}

export async function updateTournament(
  tournamentId: number,
  request: UpdateTournamentRequest,
): Promise<void> {
  await axios.patch(`tournaments/${tournamentId}`, request);
}

export async function closeTournament(tournamentId: number): Promise<void> {
  await axios.post(`tournaments/${tournamentId}/close`);
}

export async function reopenTournament(tournamentId: number): Promise<void> {
  await axios.post(`tournaments/${tournamentId}/reopen`);
}

export async function issueControlRoomKey(tournamentId: number): Promise<string> {
  const response = await axios.post<IssuedControlRoomKey>(`tournaments/${tournamentId}/control-room-key`);
  return response.data.key;
}

export async function revokeControlRoomKey(tournamentId: number): Promise<void> {
  await axios.delete(`tournaments/${tournamentId}/control-room-key`);
}

export async function getTournamentConfiguration(tournamentId: number): Promise<TournamentConfiguration> {
  const response = await axios.get<TournamentConfiguration>(`tournaments/${tournamentId}/configuration`);
  return response.data;
}

export async function getTournamentOverview(tournamentId: number): Promise<TournamentOverview> {
  const response = await axios.get<TournamentOverview>(`tournaments/${tournamentId}/overview`);
  return response.data;
}

export async function hasStartggApiKey(tournamentId: number): Promise<boolean> {
  const response = await axios.get<{ hasStartggApiKey: boolean }>(
    `tournaments/${tournamentId}/startgg/api-key-status`,
  );
  return response.data.hasStartggApiKey;
}
