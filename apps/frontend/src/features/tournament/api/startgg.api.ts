import axios from "axios";
import {
  StartggImportPreviewRequest,
  StartggImportResponse,
  StructurePlan,
} from "@/features/tournament/model/types";

export async function previewStartggImport(
  tournamentId: number,
  payload: Omit<StartggImportPreviewRequest, "targetTournamentId">,
): Promise<StructurePlan> {
  const response = await axios.post<StructurePlan>(`tournaments/${tournamentId}/startgg/import-preview`, payload);
  return response.data;
}

export async function importStartggEvent(
  tournamentId: number,
  payload: Omit<StartggImportPreviewRequest, "targetTournamentId">,
): Promise<StartggImportResponse> {
  const response = await axios.post<StartggImportResponse>(`tournaments/${tournamentId}/startgg/import`, payload);
  return response.data;
}
