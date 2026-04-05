import {
  Activity,
  ArrowRight,
  CalendarPlus,
  CircleAlert,
  DatabaseZap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDashboard } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/utils";

const statusToneMap = {
  confirmed: "blue",
  scheduled: "blue",
  completed: "green",
  missed: "red",
  cancelled: "gray",
} as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={`kpi-skeleton-${index}`}
            className="rounded-lg border border-border bg-surface p-5 shadow-card"
          >
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-4 w-32 animate-pulse rounded bg-slate-100" />
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-52 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`schedule-skeleton-${index}`}
                className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)_auto]"
              >
                <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`pipeline-skeleton-${index}`}
                className="h-14 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export function Dashboard() {
  const { data: dashboardData, error, isLoading, source } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={dashboardData.kpis.todayAppointments.toString()}
          trend={dashboardData.trends.todayAppointments.value}
          trendDirection={dashboardData.trends.todayAppointments.direction}
        />
        <StatCard
          label="Revenue This Week"
          value={formatCurrency(dashboardData.kpis.weekRevenue)}
          trend={dashboardData.trends.weekRevenue.value}
          trendDirection={dashboardData.trends.weekRevenue.direction}
        />
        <StatCard
          label="Active Patients"
          value={dashboardData.kpis.activePatients.toString()}
          trend={dashboardData.trends.activePatients.value}
          trendDirection={dashboardData.trends.activePatients.direction}
        />
        <StatCard
          label="Missed Sessions (7 days)"
          value={dashboardData.kpis.missedSessions.toString()}
          trend={dashboardData.trends.missedSessions.value}
          trendDirection={dashboardData.trends.missedSessions.direction}
          valueTone={dashboardData.kpis.missedSessions > 3 ? "danger" : "default"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
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
                  No appointments today - Add one
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your day is clear. Create a booking to start the schedule.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dashboardData.appointments.map((appointment) => (
                <Link
                  key={`${appointment.patientId}-${appointment.time}`}
                  to={`/patients/${appointment.patientId}`}
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-background sm:grid-cols-[88px_minmax(0,1fr)_auto]"
                >
                  <div className="text-sm font-semibold text-foreground">{appointment.time}</div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {appointment.patientName}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {appointment.therapist}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge
                      label={appointment.status}
                      tone={statusToneMap[appointment.status]}
                    />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pipeline Summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lead flow from inquiry to completed plan.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {dashboardData.pipelineStages.map((stage) => (
              <div
                key={stage.label}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{stage.label}</p>
                <StatusBadge label={stage.count.toString()} tone={stage.tone} />
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Needs follow-up</h3>
              <span className="text-xs font-medium text-muted-foreground">
                {dashboardData.leadsNeedingFollowUp.length} leads
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {dashboardData.leadsNeedingFollowUp.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <p className="font-medium text-foreground">{lead.name}</p>
                  <p className="text-sm text-muted-foreground">{lead.createdLabel}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <CircleAlert className="h-5 w-5 text-warning" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Needs attention</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Priority items that need action before the day closes.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {dashboardData.attentionItems.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-background p-4"
            >
              <StatusBadge label={item.badge} tone={item.tone} />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
