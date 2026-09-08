import axios from "axios";
import { Entrant, Player } from "@/features/participant/model/types";

export async function getAllPlayers(): Promise<Player[]> {
  const response = await axios.get<Player[]>("players");
  return response.data;
}

export async function bulkAddToDivision(
  divisionId: number,
  playerNames: string[],
): Promise<{ players: Player[]; warnings: string[] }> {
  const response = await axios.post<{ entrants: Entrant[]; warnings: string[] }>(
    `players/divisions/${divisionId}/bulk`,
    { playerNames },
  );
  return {
    players: response.data.entrants
      .map((entrant) => entrant.participants?.[0]?.player)
      .filter(Boolean),
    warnings: response.data.warnings,
  };
}

export async function assignPlayerToDivision(playerId: number, divisionId: number): Promise<void> {
  await axios.post(`players/${playerId}/divisions/${divisionId}`);
}

export async function removeFromDivision(playerId: number, divisionId: number): Promise<void> {
  await axios.delete(`players/${playerId}/divisions/${divisionId}`);
}
