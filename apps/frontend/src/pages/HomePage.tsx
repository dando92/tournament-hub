import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TournamentRef } from "@/features/tournament/model/types";
import { rememberTournament } from "@/shared/lib/recentTournaments";
import { usePublicTournamentsQuery } from "@/features/tournament/model/usePublicTournamentsQuery";
import TournamentCard from "@/features/tournament/ui/TournamentCard";
import CreateTournamentModal from "@/features/tournament/ui/CreateTournamentModal";
import SearchTournamentModal from "@/features/tournament/ui/SearchTournamentModal";
import { usePermissions } from "@/features/auth/model/PermissionContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export default function HomePage() {
  const { data: tournaments = [], isPending: isLoading } = usePublicTournamentsQuery();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canCreateTournament } = usePermissions();
  const canCreate = canCreateTournament;

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) {
      setCreateModalOpen(true);
      navigate("/", { replace: true });
    }
  }, [searchParams, canCreate]);

  function handleSelect(t: TournamentRef) {
    rememberTournament({ id: t.id, name: t.name });
    navigate(`/tournament/${t.id}`);
  }

  return (
    <>
      <SearchTournamentModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
      <CreateTournamentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(t) => {
          rememberTournament({ id: t.id, name: t.name });
          navigate(`/tournament/${t.id}`);
        }}
      />

      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 py-6">
          <h1 className="text-3xl font-black text-ui-text">Tournament Hub</h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ui-text">All events</h2>
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 text-sm text-ui-text-mute hover:text-ui-text-soft"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
              Find tournaments
            </button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-ui-border animate-pulse">
                  <div className="h-32 bg-ui-selected" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 bg-ui-selected rounded w-3/4" />
                    <div className="h-3 bg-ui-selected rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && tournaments.length === 0 && (
            <p className="text-ui-text-mute text-sm italic">No tournaments yet.</p>
          )}

          {!isLoading && tournaments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} onClick={() => handleSelect(t)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
