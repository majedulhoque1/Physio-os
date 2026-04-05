import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  CircleAlert,
  CreditCard,
  DatabaseZap,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import type { PatientStatus, StatusTone } from "@/types";

const scheduleStatusStyles: Record<string, string> = {
  confirmed: "border-l-indigo-500",
  scheduled: "border-l-indigo-500",
  completed: "border-l-emerald-500",
  missed: "border-l-red-500",
  cancelled: "border-l-slate-300",
};

const attentionRoutes: Record<string, string> = {
  Plans: "/patients",
  Ready: "/patients",
  Schedule: "/appointments",
  "On track": "/appointments",
  Recovery: "/patients",
  "Clean week": "/patients",
};

const attentionLinkLabels: Record<string, string> = {
  Plans: "View patients",
  Ready: "View patients",
  Schedule: "View schedule",
  "On track": "View schedule",
  Recovery: "View patients",
  "Clean week": "View patients",
};

const attentionBorderStyles: Record<StatusTone, string> = {
  yellow: "border-l-amber-400",
  indigo: "border-l-indigo-500",
  red: "border-l-red-500",
  green: "border-l-emerald-500",
  blue: "border-l-blue-500",
  purple: "border-l-purple-500",
  orange: "border-l-orange-500",
  gray: "border-l-slate-300",
};

function getPatientStatusTone(status: PatientStatus): StatusTone {
  switch (status) {
    case "active":
      return "green";
    case "completed":
      return "blue";
    case "dropped":
      return "red";
    default:
      return "gray";
  }
}

export function AdminDashboard() {
  const { can } = useAuth();
  const { data: dashboardData, error, isLoading, source } = useDashboard();

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {source === "fallback" && error ? (
        <section className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-foreground shadow-card">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning">
              <DatabaseZap className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">Starter data is showing right now</p>
              <p className="mt-1 leading-6 text-muted-foreground">{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard
          label="Today's Appointments"
          value={dashboardData.kpis.todayAppointments.toString()}
          trend={dashboardData.trends.todayAppointments.value}
          trendDirection={dashboardData.trends.todayAppointments.direction}
          icon={CalendarDays}
          accentColor="indigo"
        />
        <StatCard
          label="Active Patients"
          value={dashboardData.kpis.activePatients.toString()}
          trend={dashboardData.trends.activePatients.value}
          trendDirection={dashboardData.trends.activePatients.direction}
          icon={Users}
          accentColor="blue"
        />
        <StatCard
          label="Missed Sessions (7 days)"
          value={dashboardData.kpis.missedSessions.toString()}
          trend={dashboardData.trends.missedSessions.value}
          trendDirection={dashboardData.trends.missedSessions.direction}
          valueTone={dashboardData.kpis.missedSessions > 3 ? "danger" : "default"}
          icon={AlertTriangle}
          accentColor="red"
          className="col-span-2 xl:col-span-1"
        />
      </section>

      {/* Quick Actions */}
      <section className="flex flex-wrap gap-3">
        {can("manage_appointments") ? (
          <Link
            to="/appointments"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <CalendarPlus className="h-4 w-4" />
            New Appointment
          </Link>
        ) : null}
        {can("manage_patients") ? (
          <Link
            to="/patients?new=1"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Link>
        ) : null}
        {can("manage_billing") ? (
          <Link
            to="/billing"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Link>
        ) : null}
      </section>

      {/* Needs Attention */}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <CircleAlert className="h-5 w-5 text-warning" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Needs attention</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Priority items that need action before the day closes.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {dashboardData.attentionItems.map((item) => {
            const route = attentionRoutes[item.badge] ?? "/";
            const linkLabel = attentionLinkLabels[item.badge] ?? "View";
            const borderClass = attentionBorderStyles[item.tone] ?? "border-l-slate-300";

            return (
              <div
                key={item.title}
                className={`flex flex-col rounded-lg border border-border border-l-4 bg-background p-4 ${borderClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge label={item.badge} tone={item.tone} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                <Link
                  to={route}
                  className="mt-3 inline-flex items-center gap-1 self-end text-xs font-semibold text-primary hover:underline"
                >
                  {linkLabel}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Today's Schedule + Patient Overview */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        {/* Today's Schedule */}
        <article className="rounded-lg border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Today&apos;s Schedule</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap any row to jump into the patient profile.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              {source === "live" ? "Live" : "Demo"}
            </span>
          </div>

          {dashboardData.appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarPlus className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold text-foreground">
                  No appointments today — Add one
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your day is clear. Create a booking to start the schedule.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dashboardData.appointments.map((appointment) => {
                const borderClass =
                  scheduleStatusStyles[appointment.status] ?? "border-l-slate-300";

                return (
                  <Link
                    key={`${appointment.patientId}-${appointment.time}`}
                    to={`/patients/${appointment.patientId}`}
                    className={`flex min-h-16 items-center gap-4 border-l-4 px-5 transition-colors hover:bg-background ${borderClass}`}
                  >
                    <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                      {appointment.time}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {appointment.patientName}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {appointment.therapist}
                      </p>
                    </div>

                    <StatusBadge
                      label={appointment.status}
                      tone={
                        appointment.status === "completed"
                          ? "green"
                          : appointment.status === "missed"
                            ? "red"
                            : appointment.status === "cancelled"
                              ? "gray"
                              : "blue"
                      }
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        {/* Patient Overview */}
        <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div>
            <h2 className="text-base font-semibold text-foreground">Patient Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current patient mix and the newest records added to the clinic.
            </p>
          </div>

          {/* Status summary */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1">
            {dashboardData.patientStatuses.map((stage, index) => (
              <span key={stage.label} className="contents">
                <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">
                  <StatusBadge label={stage.count.toString()} tone={stage.tone} />
                  <span className="text-foreground">{stage.label}</span>
                </span>
                {index < dashboardData.patientStatuses.length - 1 ? (
                  <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
                ) : null}
              </span>
            ))}
          </div>

          {/* Recent patients */}
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recently added</h3>
              <span className="text-xs font-medium text-muted-foreground">
                {dashboardData.recentPatients.length} patient
                {dashboardData.recentPatients.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {dashboardData.recentPatients.map((patient) => {
                return (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{patient.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{patient.createdLabel}</p>
                    </div>
                    <StatusBadge
                      label={patient.status}
                      tone={getPatientStatusTone(patient.status)}
                    />
                  </div>
                );
              })}

              {dashboardData.recentPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No patient records have been added yet.
                </p>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
