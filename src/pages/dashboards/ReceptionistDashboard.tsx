import {
  Calendar,
  Phone,
  Users,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDashboard } from "@/hooks/useDashboard";

export function ReceptionistDashboard() {
  const { data: dashboardData, isLoading } = useDashboard();

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  const pendingAppointments = dashboardData.appointments.filter(
    (a) => a.status === "scheduled"
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={dashboardData.kpis.todayAppointments.toString()}
          trend={dashboardData.trends.todayAppointments.value}
          trendDirection={dashboardData.trends.todayAppointments.direction}
          icon={Calendar}
          accentColor="indigo"
        />
        <StatCard
          label="Pending Confirmations"
          value={pendingAppointments.length.toString()}
          trend="0%"
          trendDirection="down"
          icon={AlertTriangle}
          accentColor="orange"
        />
        <StatCard
          label="New Leads This Week"
          value="5"
          trend="20%"
          trendDirection="up"
          icon={Phone}
          accentColor="blue"
        />
        <StatCard
          label="Follow-ups Needed"
          value="3"
          trend="0%"
          trendDirection="down"
          icon={Users}
          accentColor="emerald"
        />
      </section>

      {/* Appointments Section */}
      <section className="rounded-lg border border-border bg-surface shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Today's Appointments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click to view details or make changes.
          </p>
        </div>

        {dashboardData.appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">
                No appointments today
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                It's a quiet day. Check back later.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dashboardData.appointments.map((appointment) => {
              const needsConfirmation = appointment.status === "scheduled";

              return (
                <Link
                  key={`${appointment.patientId}-${appointment.time}`}
                  to={`/appointments`}
                  className="flex min-h-16 items-center gap-4 border-l-4 border-l-indigo-500 px-5 transition-colors hover:bg-background"
                >
                  <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                    {appointment.time}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {appointment.patientName}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      with {appointment.therapist}
                    </p>
                  </div>

                  {needsConfirmation && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Confirm
                    </span>
                  )}

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
              );
            })}
          </div>
        )}

        <div className="border-t border-border px-5 py-3">
          <Link
            to="/appointments"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Manage all appointments
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* New Leads & Follow-ups */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* New Leads */}
        <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground">New Leads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent inquiries that need attention.
          </p>

          <div className="mt-4 space-y-3">
            {[
              { name: "Ahmed Khan", source: "WhatsApp", status: "new" },
              { name: "Fatima Begum", source: "Facebook", status: "new" },
              { name: "Rahman Saikh", source: "Referral", status: "contacted" },
            ].map((lead) => (
              <div
                key={lead.name}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{lead.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{lead.source}</p>
                </div>
                <StatusBadge
                  label={lead.status}
                  tone={lead.status === "new" ? "orange" : "blue"}
                />
              </div>
            ))}
          </div>

          <Link
            to="/leads"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View all leads
            <ChevronRight className="h-4 w-4" />
          </Link>
        </article>

        {/* Patient Check-ins */}
        <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Patient Check-ins</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Patients who need follow-up calls.
          </p>

          <div className="mt-4 space-y-3">
            {[
              { name: "Lamia Haque", days: 3, status: "follow-up" },
              { name: "Arman Khan", days: 5, status: "follow-up" },
              { name: "Nusrat Jahan", days: 7, status: "payment-due" },
            ].map((patient) => (
              <div
                key={patient.name}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{patient.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Last visit {patient.days} days ago
                  </p>
                </div>
                <StatusBadge
                  label={patient.status === "payment-due" ? "Payment Due" : "Follow-up"}
                  tone={patient.status === "payment-due" ? "red" : "yellow"}
                />
              </div>
            ))}
          </div>

          <Link
            to="/patients"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View all patients
            <ChevronRight className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </div>
  );
}
