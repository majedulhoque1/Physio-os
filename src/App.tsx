import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { Analytics } from "@/pages/Analytics";
import { Appointments } from "@/pages/Appointments";
import { Billing } from "@/pages/Billing";
import { Dashboard } from "@/pages/Dashboard";
import { Leads } from "@/pages/Leads";
import { PatientProfile } from "@/pages/PatientProfile";
import { Patients } from "@/pages/Patients";
import { TherapistWorkspace } from "@/pages/TherapistWorkspace";

function withBoundary(element: ReactNode) {
  return <PageErrorBoundary>{element}</PageErrorBoundary>;
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={withBoundary(<Dashboard />)} />
        <Route path="leads" element={withBoundary(<Leads />)} />
        <Route path="appointments" element={withBoundary(<Appointments />)} />
        <Route path="patients" element={withBoundary(<Patients />)} />
        <Route path="patients/:id" element={withBoundary(<PatientProfile />)} />
        <Route path="workspace" element={withBoundary(<TherapistWorkspace />)} />
        <Route path="billing" element={withBoundary(<Billing />)} />
        <Route path="analytics" element={withBoundary(<Analytics />)} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
