import axios from "axios";

type CreatePhaseGroupRequest = {
  name?: string;
  displayIdentifier?: string;
  bracketType?: string;
};

type UpdatePhaseGroupRequest = {
  name?: string;
  displayIdentifier?: string;
  bracketType?: string;
};

export async function createPhaseGroup(phaseId: number, request: CreatePhaseGroupRequest): Promise<number> {
  const response = await axios.post<{ id: number }>(`phases/${phaseId}/phase-groups`, request);
  return response.data.id;
}

export async function updatePhaseGroup(phaseGroupId: number, request: UpdatePhaseGroupRequest): Promise<void> {
  await axios.patch(`phase-groups/${phaseGroupId}`, request);
}

export async function deletePhaseGroup(phaseGroupId: number): Promise<void> {
  await axios.delete(`phase-groups/${phaseGroupId}`);
}
