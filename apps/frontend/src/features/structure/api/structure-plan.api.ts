import axios from "axios";
import type { StructurePlan, StructurePlanAppliedDto } from "@tournament-hub/contracts";

export async function applyStructurePlan(tournamentId: number, plan: StructurePlan): Promise<StructurePlanAppliedDto> {
  const response = await axios.post<StructurePlanAppliedDto>(`tournaments/${tournamentId}/structure/plans`, plan);

  return response.data;
}
