import { ReactNode } from "react";
import axios from "axios";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/model/AuthContext";
import { PermissionProvider } from "@/features/auth/model/PermissionContext";
import { PageNoticeProvider } from "@/shared/context/PageNoticeContext";
import { apiUrl } from "@/shared/runtime-config";

// Set at module scope, not in an effect: every *.api.ts module calls a bare
// axios, so the defaults must be in place before the first render.
axios.defaults.baseURL = apiUrl();

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Remote state is refetched when something says it changed — a mutation or a
// realtime signal — never on window focus or a timer.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PermissionProvider>
            <PageNoticeProvider>{children}</PageNoticeProvider>
          </PermissionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
