import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPath } from "@/lib/permissions";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { SuperAdminRoute } from "@/lib/superAdminGuard";
import { Analytics } from "@/pages/Analytics";
import { Appointments } from "@/pages/Appointments";
import { Billing } from "@/pages/Billing";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { MessageLog } from "@/pages/MessageLog";
import { PatientProfile } from "@/pages/PatientProfile";
import { Patients } from "@/pages/Patients";
import { Settings } from "@/pages/Settings";
import { SuperAdminDashboard } from "@/pages/super-admin/SuperAdminDashboard";
import { SuperAdminLogin } from "@/pages/super-admin/SuperAdminLogin";
import { SuperAdminSettings } from "@/pages/super-admin/SuperAdminSettings";
import { SuperAdminTenantDetail } from "@/pages/super-admin/SuperAdminTenantDetail";
import { SuperAdminBilling } from "@/pages/super-admin/SuperAdminBilling";
import { SuperAdminTenants } from "@/pages/super-admin/SuperAdminTenants";
import { Therapists } from "@/pages/Therapists";

function withBoundary(element: ReactNode) {
  return <PageErrorBoundary>{element}</PageErrorBoundary>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate replace to="/login" />;

  return <>{children}</>;
}

function RoleRoute({
  children,
  path,
}: {
  children: ReactNode;
  path: string;
}) {
  const { role } = useAuth();

  if (!canAccessPath(path, role)) {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate replace to="/" /> : <Login />}
      />

      {/* Super Admin */}
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminShell />
          </SuperAdminRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="tenants" element={<SuperAdminTenants />} />
        <Route path="tenants/:id" element={<SuperAdminTenantDetail />} />
        <Route path="billing" element={<SuperAdminBilling />} />
        <Route path="settings" element={<SuperAdminSettings />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={withBoundary(<Dashboard />)} />
        <Route path="leads" element={<Navigate replace to="/patients?new=1" />} />
        <Route
          path="appointments"
          element={withBoundary(
            <RoleRoute path="/appointments">
              <Appointments />
            </RoleRoute>,
          )}
        />
        <Route
          path="patients"
          element={withBoundary(
            <RoleRoute path="/patients">
              <Patients />
            </RoleRoute>,
          )}
        />
        <Route
          path="patients/:id"
          element={withBoundary(
            <RoleRoute path="/patients/:id">
              <PatientProfile />
            </RoleRoute>,
          )}
        />
        <Route
          path="therapists"
          element={withBoundary(
            <RoleRoute path="/therapists">
              <Therapists />
            </RoleRoute>,
          )}
        />
        <Route path="workspace" element={<Navigate replace to="/therapists" />} />
        <Route
          path="billing"
          element={withBoundary(
            <RoleRoute path="/billing">
              <Billing />
            </RoleRoute>,
          )}
        />
        <Route
          path="analytics"
          element={withBoundary(
            <RoleRoute path="/analytics">
              <Analytics />
            </RoleRoute>,
          )}
        />
        <Route
          path="messages"
          element={withBoundary(
            <RoleRoute path="/messages">
              <MessageLog />
            </RoleRoute>,
          )}
        />
        <Route
          path="settings"
          element={withBoundary(
            <RoleRoute path="/settings">
              <Settings />
            </RoleRoute>,
          )}
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
