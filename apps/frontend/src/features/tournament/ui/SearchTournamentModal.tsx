import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import BaseModal from "@/shared/components/ui/BaseModal";
import { TournamentRef } from "@/features/tournament/model/types";
import { rememberTournament } from "@/shared/lib/recentTournaments";
import { usePublicTournamentsQuery } from "@/features/tournament/model/usePublicTournamentsQuery";
import { getBannerGradient } from "@/features/tournament/model/tournamentBanner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchTournamentModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const { data: tournaments = [] } = usePublicTournamentsQuery(open);
  const inputRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = query.trim()
    ? tournaments.filter((t) =>
        t.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : tournaments;

  function handleSelect(t: TournamentRef) {
    rememberTournament({ id: t.id, name: t.name });
    navigate(`/tournament/${t.id}`);
    onClose();
  }

  return (
    <BaseModal open={open} onClose={onClose} maxWidth="max-w-lg" initialFocus={inputRef}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ui-text">Search tournaments</h3>
          <p className="text-sm text-ui-text-mute">Open an event.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 border border-ui-border rounded-lg px-3 py-2 mb-5 focus-within:border-ui-border-strong transition-colors">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-ui-text-mute shrink-0" />
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tournaments..."
          className="flex-1 outline-none text-ui-text text-sm bg-transparent"
        />
      </div>

      <div className="flex flex-col">
        {filtered.length === 0 && (
          <p className="text-sm text-ui-text-mute italic px-1">No tournaments found.</p>
        )}
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="flex items-center gap-3 px-1 py-2.5 hover:bg-ui-raised rounded transition-colors text-left"
          >
            <div
              className={`h-12 w-12 rounded shrink-0 bg-gradient-to-br ${getBannerGradient(t.id)} flex items-center justify-center`}
            >
              <span className="text-white font-black text-lg opacity-40 select-none">
                {t.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs text-ui-text-mute font-semibold uppercase tracking-wide">
                Tournament
              </span>
              <span className="text-sm font-semibold text-ui-text truncate">{t.name}</span>
            </div>
          </button>
        ))}
      </div>
    </BaseModal>
  );
}
