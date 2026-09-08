import { usePermissions } from "@/features/auth/model/PermissionContext";
import ManageRolesSection from "@/features/configuration/ui/ManageRolesSection";
import ThemePreferenceSection from "@/features/configuration/ui/ThemePreferenceSection";

export default function TournamentHubConfigurationPage() {
  const { isAdmin } = usePermissions();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h1 className="text-3xl font-bold text-ui-text">Tournament Hub Configuration</h1>
      <ThemePreferenceSection />
      {isAdmin && <ManageRolesSection />}
    </div>
  );
}
