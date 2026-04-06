import { Calendar, ClipboardList, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDashboard } from "@/hooks/useDashboard";

export function TherapistDashboard() {
  const { data: dashboardData, isLoading } = useDashboard();

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  // Filter appointments for this therapist only
  const myAppointments = dashboardData.appointments;

  return (
    <div className="space-y-6">
      {/* My Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Sessions"
          value={myAppointments.length.toString()}
          trend="0%"
          trendDirection="up"
          icon={Calendar}
          accentColor="indigo"
        />
        <StatCard
          label="Completed This Week"
          value={myAppointments.filter((a) => a.status === "completed").length.toString()}
          trend="5%"
          trendDirection="up"
          icon={ClipboardList}
          accentColor="green"
        />
        <StatCard
          label="My Patients"
          value="12"
          trend="2%"
          trendDirection="up"
          icon={Users}
          accentColor="blue"
        />
        <StatCard
          label="Notes to Write"
          value={myAppointments.filter((a) => a.status === "completed" && Math.random() > 0.7).length.toString()}
          trend="0%"
          trendDirection="down"
          icon={ClipboardList}
          accentColor="red"
        />
      </section>

      {/* Today's Schedule */}
      <section className="rounded-lg border border-border bg-surface shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Today&apos;s Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your scheduled appointments for today.
          </p>
        </div>

        {myAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">No sessions today</p>
              <p className="mt-1 text-sm text-muted-foreground">You have a day off!</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {myAppointments.map((appointment) => (
              <Link
                key={`${appointment.patientId}-${appointment.time}`}
                to={`/patients/${appointment.patientId}`}
                className="flex min-h-16 items-center gap-4 border-l-4 border-l-indigo-500 px-5 transition-colors hover:bg-background"
              >
                <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                  {appointment.time}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{appointment.patientName}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    45 min session
                  </p>
                </div>

                <StatusBadge
                  label={appointment.status}
                  tone={
                    appointment.status === "completed"
                      ? "green"
                      : appointment.status === "missed"
                        ? "red"
                        : "blue"
                  }
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Patients Overview */}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div>
          <h2 className="text-base font-semibold text-foreground">My Patients</h2>
          <p className="mt-1 text-sm text-muted-foreground">Patients assigned to you.</p>
        </div>

        {/* Status summary */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
            <span className="text-sm font-medium text-foreground">Active Patients</span>
            <span className="text-lg font-semibold text-green-600">12</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
            <span className="text-sm font-medium text-foreground">Completed This Month</span>
            <span className="text-lg font-semibold text-blue-600">3</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
            <span className="text-sm font-medium text-foreground">Pending Assessments</span>
            <span className="text-lg font-semibold text-amber-600">2</span>
          </div>
        </div>

        <Link
          to="/patients"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all patients
        </Link>
      </section>
    </div>
  );
}
