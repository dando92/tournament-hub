import { useEffect, useState } from "react";
import { AdminAccount } from "@/features/auth/model/types";
import { listAccounts, updateAccountFlags } from "@/features/auth/api/account.api";
import { usePageNotices } from "@/shared/context/PageNoticeContext";

type AccountFlag = "isAdmin" | "isTournamentCreator";

const UPDATE_FAILED = "Failed to update the account.";

export function useManageRolesPage() {
  const { report, dismiss } = usePageNotices();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedToLoad, setFailedToLoad] = useState(false);

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch(() => setFailedToLoad(true))
      .finally(() => setLoading(false));
  }, []);

  async function changeFlag(accountId: string, flag: AccountFlag, value: boolean) {
    try {
      const updated = await updateAccountFlags(accountId, { [flag]: value });
      setAccounts((current) => current.map((account) => (account.id === accountId ? updated : account)));
      dismiss(UPDATE_FAILED);
    } catch {
      report(UPDATE_FAILED);
    }
  }

  return { accounts, loading, failedToLoad, changeFlag };
}
