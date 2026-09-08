import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import { AuthState } from "@/features/auth/model/authReducer";
import { Account } from "@/features/auth/model/types";

interface AuthContextValue {
  state: AuthState;
  actions: {
    login: (username: string, password: string) => Promise<Account>;
    logout: () => void;
    register: (username: string, email: string, password: string, playerName?: string) => Promise<Account>;
    loadCurrentUser: () => Promise<void>;
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    auth.actions.loadCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
