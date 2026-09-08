import axios from "axios";
import type { MyTournamentRolesDto } from "@tournament-hub/contracts";

export async function getMyTournamentRoles(): Promise<MyTournamentRolesDto> {
  const response = await axios.get<MyTournamentRolesDto>("tournaments/my-roles");
  return response.data;
}
