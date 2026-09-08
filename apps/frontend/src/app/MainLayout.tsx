import { Suspense, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Sidebar from "@/shared/components/layout/Sidebar";
import ResizableSidebar from "@/shared/components/layout/ResizableSidebar";
import { MobileBottomNav } from "@/shared/components/layout/MobileNav";
import PageNotices from "@/shared/components/ui/PageNotices";
import { TournamentUpdatesProvider } from "@/features/tournament/model/TournamentUpdates";
import { TournamentTreeProvider } from "@/features/tournament/model/TournamentTreeContext";
import { getSelectedTournament, getSidebarTournaments } from "@/shared/lib/recentTournaments";
import { parseTreeSelection } from "@/features/tournament/model/treeSelection";
import { usePermissions } from "@/features/auth/model/PermissionContext";
import "react-toastify/dist/ReactToastify.css";

export default function MainLayout() {
  const location = useLocation();
  const { canEditTournament } = usePermissions();

  const routeTournamentId = useMemo(
    () => parseTreeSelection(location.pathname)?.tournamentId ?? null,
    [location.pathname],
  );

  const [scopedTournamentId, setScopedTournamentId] = useState<number | null>(
    () => getSelectedTournament()?.id ?? null,
  );
  useEffect(() => {
    if (routeTournamentId !== null && routeTournamentId !== scopedTournamentId) {
      setScopedTournamentId(routeTournamentId);
    }
  }, [routeTournamentId, scopedTournamentId]);

  const tournamentId = routeTournamentId ?? scopedTournamentId;
  const canEdit = tournamentId !== null && canEditTournament(tournamentId);

  const tournamentName = useMemo(() => {
    if (tournamentId === null) return "";
    return getSidebarTournaments().find((entry) => entry.id === tournamentId)?.name ?? "";
  }, [tournamentId]);

  return (
    <TournamentUpdatesProvider key={tournamentId ?? 0} tournamentId={tournamentId ?? 0} canEdit={canEdit}>
      <TournamentTreeProvider
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        controls={canEdit}
      >
        <div className="flex h-[100dvh] overflow-hidden">
          <ResizableSidebar>
            <Sidebar />
          </ResizableSidebar>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ToastContainer position="bottom-right" className="!bottom-20 md:!bottom-4" style={{ zIndex: 99999 }} />
            <main className="flex flex-1 flex-col overflow-y-auto p-4 pb-20 md:pb-4">
              <PageNotices />
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </main>
            <MobileBottomNav />
          </div>
        </div>
      </TournamentTreeProvider>
    </TournamentUpdatesProvider>
  );
}
