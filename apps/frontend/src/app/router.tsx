import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { PageTitleProvider } from "@/shared/context/PageTitleContext";
import ProtectedRoute from "@/shared/components/layout/ProtectedRoute";

const MainLayout = lazy(() => import("@/app/MainLayout"));

const HomePage = lazy(() => import("@/pages/HomePage"));
const BrowsePage = lazy(() => import("@/pages/BrowsePage"));
const TournamentPage = lazy(() => import("@/pages/tournament/TournamentPage"));
const DivisionPage = lazy(() => import("@/pages/tournament/division/DivisionPage"));
const DivisionMatchesPage = lazy(() => import("@/pages/tournament/division/MatchesPage"));
const DivisionPlayersPage = lazy(() => import("@/pages/tournament/division/PlayersPage"));
const DivisionSeedingPage = lazy(() => import("@/pages/tournament/division/SeedingPage"));
const SchedulePage = lazy(() => import("@/pages/tournament/SchedulePage"));
const StructurePage = lazy(() => import("@/pages/tournament/StructurePage"));
const ParticipantsPage = lazy(() => import("@/pages/tournament/ParticipantsPage"));
const SongsPage = lazy(() => import("@/pages/tournament/SongsPage"));
const ControlRoomPage = lazy(() => import("@/pages/tournament/ControlRoomPage"));
const StatsPage = lazy(() => import("@/pages/tournament/StatsPage"));
const ConfigurationPage = lazy(() => import("@/pages/tournament/ConfigurationPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const AccountInfoPage = lazy(() => import("@/pages/account/AccountInfoPage"));
const TournamentHubConfigurationPage = lazy(
  () => import("@/pages/configuration/TournamentHubConfigurationPage"),
);

function KeyedTournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  return <TournamentPage key={tournamentId ?? "none"} />;
}

export default function AppRouter() {
  return (
    <PageTitleProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />

            <Route path="/tournament" element={<TournamentPage />} />
            <Route path="/tournament/:tournamentId" element={<KeyedTournamentPage />}>
              <Route index element={<Navigate to="schedule" replace />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="overview" element={<Navigate to="../schedule" replace />} />
              <Route path="structure" element={<StructurePage />} />
              <Route path="participants" element={<ParticipantsPage />} />
              <Route path="songs" element={<SongsPage />} />
              <Route path="control-room" element={<ControlRoomPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="configuration" element={<ConfigurationPage />} />

              <Route path="division/:divisionId" element={<DivisionPage />}>
                <Route index element={<DivisionMatchesPage />} />
                <Route path="phase/:phaseId" element={<DivisionMatchesPage />} />
                <Route path="phase/:phaseId/pool/:poolId" element={<DivisionMatchesPage />} />
                <Route path="entrants" element={<DivisionPlayersPage />} />
                <Route path="seeding" element={<DivisionSeedingPage />} />
              </Route>
            </Route>

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/configuration" element={<TournamentHubConfigurationPage />} />

            <Route element={<ProtectedRoute require="auth" />}>
              <Route path="/account" element={<AccountInfoPage />} />
            </Route>

            <Route element={<ProtectedRoute require="admin" />}>
              <Route path="/admin/roles" element={<Navigate to="/configuration" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </PageTitleProvider>
  );
}
