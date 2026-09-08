import axios from "axios";
import { Entrant } from "@/features/participant/model/types";
import { Division, GenerateBracketRequest, GenerateBracketResultDto } from "@/features/division/model/types";

export async function getDivisionSummary(divisionId: number): Promise<Division> {
  const response = await axios.get<Division>(`divisions/${divisionId}/summary`);
  return response.data;
}

export async function createDivision(tournamentId: number, name: string): Promise<void> {
  await axios.post("divisions", { tournamentId, name });
}

export async function renameDivision(divisionId: number, name: string): Promise<void> {
  await axios.patch(`divisions/${divisionId}`, { name });
}

export async function deleteDivision(divisionId: number): Promise<void> {
  await axios.delete(`divisions/${divisionId}`);
}

export async function listDivisionEntrants(divisionId: number): Promise<Entrant[]> {
  const response = await axios.get<Entrant[]>(`divisions/${divisionId}/entrants`);
  return response.data;
}

export async function updateDivisionSeeding(divisionId: number, entrantIds: number[]): Promise<void> {
  await axios.patch(`divisions/${divisionId}/entrants/seeding`, { entrantIds });
}

export async function listBracketTypes(): Promise<string[]> {
  const response = await axios.get<string[]>("bracket/bracket-types");
  return response.data;
}

export async function generateBracket(request: GenerateBracketRequest): Promise<GenerateBracketResultDto> {
  const response = await axios.post<GenerateBracketResultDto>(
    `divisions/${request.divisionId}/generate-bracket`,
    {
      phaseId: request.phaseId,
      phaseName: request.phaseName,
      bracketType: request.bracketType,
      playerPerMatch: request.playerPerMatch,
    },
  );
  return response.data;
}
