import { Suspense } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { usePermissions } from "@/features/auth/model/PermissionContext";
import { DivisionPageContextValue } from "@/features/division/model/DivisionPageContext";
import { useDivisionPage } from "@/features/division/model/useDivisionPage";

export default function DivisionPage() {
  const { tournamentId: tidParam, divisionId: didParam } = useParams<{ tournamentId: string; divisionId: string }>();
  const tournamentId = Number(tidParam);
  const divisionId = Number(didParam);

  if (!Number.isFinite(tournamentId) || !Number.isFinite(divisionId)) {
    return <Navigate to="/" replace />;
  }

  return <DivisionPageContainer tournamentId={tournamentId} divisionId={divisionId} />;
}

function DivisionPageContainer({ tournamentId, divisionId }: { tournamentId: number; divisionId: number }) {
  const { canEditTournament } = usePermissions();
  const { division, entrants } = useDivisionPage(tournamentId, divisionId);

  if (!division) return null;

  const context: DivisionPageContextValue = {
    division,
    entrants,
    tournamentId,
    divisionId,
    controls: canEditTournament(tournamentId),
  };

  return (
    <Suspense fallback={null}>
      <Outlet context={context} />
    </Suspense>
  );
}
