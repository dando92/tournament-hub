import { AdminAccount } from "@/features/auth/model/types";

type Props = {
  account: AdminAccount;
  onFlagChange: (flag: "isAdmin" | "isTournamentCreator", value: boolean) => void;
};

export default function RoleAccountItem({ account, onFlagChange }: Props) {
  return (
    <div className="flex flex-row items-center justify-between bg-ui-raised px-5 py-4 rounded-lg">
      <div>
        <p className="font-semibold">{account.username}</p>
      </div>
      <div className="flex flex-row gap-6">
        <label className="flex flex-row items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={account.isTournamentCreator}
            onChange={(e) => onFlagChange("isTournamentCreator", e.target.checked)}
          />
          <span className="text-sm">Tournament Creator</span>
        </label>
        <label className="flex flex-row items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={account.isAdmin}
            onChange={(e) => onFlagChange("isAdmin", e.target.checked)}
          />
          <span className="text-sm">Admin</span>
        </label>
      </div>
    </div>
  );
}
