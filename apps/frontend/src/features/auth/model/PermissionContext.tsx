import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { useAuthContext } from "@/features/auth/model/AuthContext";
import { getMyTournamentRoles } from "@/features/auth/api/roles.api";

interface PermissionState {
  isAdmin: boolean;
  canCreateTournament: boolean;
  ownedTournamentIds: number[];
  staffTournamentIds: number[];
  isLoaded: boolean;
}

interface PermissionContextValue extends PermissionState {
  canEditTournament: (tournamentId: number) => boolean;
  reload: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

const EMPTY_STATE: PermissionState = {
  isAdmin: false,
  canCreateTournament: false,
  ownedTournamentIds: [],
  staffTournamentIds: [],
  isLoaded: false,
};

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuthContext();
  const [permissions, setPermissions] = useState<PermissionState>(EMPTY_STATE);
  const loadedTokenRef = useRef<string | null>(null);

  const clear = useCallback(() => {
    loadedTokenRef.current = null;
    setPermissions({ ...EMPTY_STATE, isLoaded: true });
  }, []);

  const load = useCallback(async (force = false) => {
    const { token, account } = authState;
    if (!token || !account) {
      clear();
      return;
    }

    if (!force && loadedTokenRef.current === token) {
      return;
    }

    setPermissions((current) => ({ ...current, isLoaded: false }));
    try {
      const data = await getMyTournamentRoles();
      setPermissions({
        isAdmin: data.isAdmin,
        canCreateTournament: data.canCreateTournament,
        ownedTournamentIds: data.ownedTournamentIds,
        staffTournamentIds: data.staffTournamentIds,
        isLoaded: true,
      });
      loadedTokenRef.current = token;
    } catch {
      clear();
    }
  }, [authState, clear]);

  useEffect(() => {
    const { token, account } = authState;
    if (!token || !account) {
      clear();
      return;
    }

    if (loadedTokenRef.current !== token) {
      load().catch(() => {});
    }
  }, [authState, clear, load]);

  const canEditTournament = useCallback(
    (tournamentId: number): boolean => {
      if (permissions.isAdmin) return true;
      return (
        permissions.ownedTournamentIds.includes(tournamentId) ||
        permissions.staffTournamentIds.includes(tournamentId)
      );
    },
    [permissions]
  );

  return (
    <PermissionContext.Provider
      value={{ ...permissions, canEditTournament, reload: () => load(true) }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
}
