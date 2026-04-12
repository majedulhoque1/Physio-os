import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate replace to="/super-admin/login" />;
  if (!isSuperAdmin) return <Navigate replace to="/" />;

  return <>{children}</>;
}
