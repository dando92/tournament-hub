import { Suspense, useMemo } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import TournamentPageHeader from "@/features/tournament/ui/header/TournamentPageHeader";
import { TournamentPageContextValue } from "@/features/tournament/model/TournamentPageContext";
import { useTournamentPageContainer } from "@/features/tournament/model/useTournamentPageContainer";
import { getSelectedTournament } from "@/shared/lib/recentTournaments";

export default function TournamentPage() {
  const { tournamentId: tidParam } = useParams<{ tournamentId?: string }>();
  const selectedTournamentId = tidParam ? Number(tidParam) : null;

  if (selectedTournamentId === null) {
    const last = getSelectedTournament();
    return <Navigate to={last ? `/tournament/${last.id}/schedule` : "/"} replace />;
  }

  return <TournamentShell tournamentId={selectedTournamentId} />;
}

function TournamentShell({ tournamentId }: { tournamentId: number }) {
  const { context } = useTournamentPageContainer(tournamentId);
  return <TournamentFrame context={context} />;
}

function TournamentFrame({ context }: { context: TournamentPageContextValue }) {
  const location = useLocation();
  const { tournamentId } = context;

  const page = useMemo(() => {
    const at = (key: string) => location.pathname === `/tournament/${tournamentId}/${key}`;
    return {
      isSongsPage: at("songs"),
      isParticipantsPage: at("participants"),
      isStructurePage: at("structure"),
    };
  }, [location.pathname, tournamentId]);

  const content = (
    <>
      <TournamentPageHeader
        tournamentId={tournamentId}
        tournamentName={context.tournamentName}
        controls={context.controls}
        isSongsPage={page.isSongsPage}
        isParticipantsPage={page.isParticipantsPage}
        onOpenParticipantsManageModal={context.setParticipantsManageModal}
      />

      <Suspense fallback={null}>
        <Outlet context={context} />
      </Suspense>
    </>
  );

  return <div className={`flex flex-col gap-4 ${page.isStructurePage ? "min-h-0 flex-1" : ""}`}>{content}</div>;
}
