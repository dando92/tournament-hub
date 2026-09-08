import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/features/auth/model/AuthContext";
import { usePermissions } from "@/features/auth/model/PermissionContext";

interface ProtectedRouteProps {
  require?: "auth" | "admin" | "owner";
}

export default function ProtectedRoute({ require }: ProtectedRouteProps) {
  const { state } = useAuthContext();
  const permissions = usePermissions();
  const location = useLocation();

  if (state.isLoading || !permissions.isLoaded) {
    return null;
  }

  if (!state.account) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (require === "admin" && !permissions.isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (require === "owner" && !permissions.canCreateTournament) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
