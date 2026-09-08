import axios from "axios";
import { AdminAccount } from "@/features/auth/model/types";

export type AccountProfilePatch = {
  playerName?: string;
  nationality?: string;
  grooveStatsApi?: string;
  profilePicture?: string;
};

export async function updateAccountProfile(accountId: string, patch: AccountProfilePatch): Promise<void> {
  await axios.patch(`user/${accountId}/profile`, patch);
}

export async function listAccounts(): Promise<AdminAccount[]> {
  const response = await axios.get<AdminAccount[]>("user");
  return response.data;
}

export async function updateAccountFlags(
  accountId: string,
  flags: Partial<Pick<AdminAccount, "isAdmin" | "isTournamentCreator">>,
): Promise<AdminAccount> {
  const response = await axios.patch<AdminAccount>(`user/${accountId}/flags`, flags);
  return response.data;
}
