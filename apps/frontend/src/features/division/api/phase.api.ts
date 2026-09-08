import axios from "axios";

type UpdatePhaseRequest = {
  name?: string;
};

export async function createPhase(divisionId: number, name: string): Promise<number> {
  const response = await axios.post<{ id: number }>("phases", { name, divisionId });
  return response.data.id;
}

export async function updatePhase(phaseId: number, request: UpdatePhaseRequest): Promise<void> {
  await axios.patch(`phases/${phaseId}`, request);
}

export async function deletePhase(phaseId: number): Promise<void> {
  await axios.delete(`phases/${phaseId}`);
}
