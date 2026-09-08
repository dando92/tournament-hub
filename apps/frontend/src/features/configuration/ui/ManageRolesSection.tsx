import { useManageRolesPage } from "@/features/auth/model/useManageRolesPage";
import RoleAccountItem from "@/features/auth/ui/RoleAccountItem";

export default function ManageRolesSection() {
  const { accounts, loading, failedToLoad, changeFlag } = useManageRolesPage();

  return (
    <section className="rounded-lg border border-ui-border bg-ui-surface p-4">
      <h2 className="mb-4 text-xl font-bold text-ui-text">Manage Roles</h2>
      {loading ? (
        <p className="text-ui-text-mute">Loading...</p>
      ) : failedToLoad ? (
        <p className="text-state-failed">The accounts could not be loaded.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <RoleAccountItem
              key={account.id}
              account={account}
              onFlagChange={(flag, value) => changeFlag(account.id, flag, value)}
            />
          ))}
          {accounts.length === 0 && <p className="text-ui-text-mute">No accounts found.</p>}
        </div>
      )}
    </section>
  );
}
