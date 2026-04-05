import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { TherapistDashboard } from "./dashboards/TherapistDashboard";
import { ReceptionistDashboard } from "./dashboards/ReceptionistDashboard";

export function Dashboard() {
  const { role } = useAuth();

  switch (role) {
    case "clinic_admin":
      return <AdminDashboard />;
    case "therapist":
      return <TherapistDashboard />;
    case "receptionist":
      return <ReceptionistDashboard />;
    default:
      return <div>No role assigned</div>;
  }
}
