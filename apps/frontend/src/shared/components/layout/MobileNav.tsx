import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faListUl,
  faMagnifyingGlass,
  faRightFromBracket,
  faRightToBracket,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import SearchTournamentModal from "@/features/tournament/ui/SearchTournamentModal";
import { useAuthContext } from "@/features/auth/model/AuthContext";

export function MobileBottomNav() {
  const { state, actions } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const onAccount =
    location.pathname === "/account" || location.pathname === "/login" || location.pathname === "/register";

  return (
    <>
      <SearchTournamentModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-ui-border bg-ui-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavButton
          icon={faListUl}
          label="Browse"
          active={location.pathname === "/browse"}
          onClick={() => navigate("/browse")}
        />
        <NavButton icon={faMagnifyingGlass} label="Search" active={false} onClick={() => setSearchOpen(true)} />
        {state.account ? (
          <>
            <NavButton icon={faUser} label="Account" active={onAccount} onClick={() => navigate("/account")} />
            <NavButton
              icon={faRightFromBracket}
              label="Logout"
              active={false}
              onClick={() => {
                actions.logout();
                navigate("/");
              }}
            />
          </>
        ) : (
          <NavButton
            icon={faRightToBracket}
            label="Login"
            active={onAccount}
            onClick={() => navigate("/login", { state: { from: location.pathname } })}
          />
        )}
      </nav>
    </>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconDefinition;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
        active
          ? "font-semibold text-ui-text shadow-[inset_0_3px_0_0_rgb(var(--ui-accent))]"
          : "text-ui-text-mute hover:text-ui-text"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="text-xl" />
      <span>{label}</span>
    </button>
  );
}
