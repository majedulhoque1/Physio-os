import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  ChevronRight,
  CreditCard,
  DatabaseZap,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardAppointmentItem, StatusTone } from "@/types";

/* ── Derive per-therapist utilization from appointment list ── */
function buildUtilization(appointments: DashboardAppointmentItem[]) {
  const map = new Map<string, { total: number; done: number; missed: number }>();

  for (const appt of appointments) {
    const slot = map.get(appt.therapist) ?? { total: 0, done: 0, missed: 0 };
    slot.total++;
    if (appt.status === "completed") slot.done++;
    if (appt.status === "missed") slot.missed++;
    map.set(appt.therapist, slot);
  }

  return Array.from(map.entries())
    .map(([name, s]) => ({
      name,
      total: s.total,
      done: s.done,
      missed: s.missed,
      pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);
}

/* ── Classify appointments for the time-spine ── */
function classifyAppointments(appointments: DashboardAppointmentItem[]) {
  const past: DashboardAppointmentItem[] = [];
  const future: DashboardAppointmentItem[] = [];
  let active: DashboardAppointmentItem | null = null;

  for (const appt of appointments) {
    if (appt.status === "completed" || appt.status === "missed" || appt.status === "cancelled") {
      past.push(appt);
    } else if (!active) {
      active = appt;
    } else {
      future.push(appt);
    }
  }

  return { past, active, future };
}

const attentionRoutes: Record<string, string> = {
  Plans: "/patients",
  Ready: "/patients",
  Schedule: "/appointments",
  "On track": "/appointments",
  Recovery: "/patients",
  "Clean week": "/patients",
};

const attentionBorderStyles: Record<StatusTone, string> = {
  yellow: "border-l-amber-400",
  indigo: "border-l-indigo-400",
  red: "border-l-rose-400",
  green: "border-l-emerald-400",
  blue: "border-l-sky-400",
  purple: "border-l-violet-400",
  orange: "border-l-orange-400",
  gray: "border-l-stone-300",
};

const alertIconColor: Record<StatusTone, string> = {
  red: "text-rose-500",
  yellow: "text-amber-500",
  indigo: "text-indigo-500",
  blue: "text-sky-500",
  green: "text-emerald-500",
  orange: "text-orange-500",
  purple: "text-violet-500",
  gray: "text-stone-400",
};

export function AdminDashboard() {
  const { can } = useAuth();
  const { data, error, isLoading, source } = useDashboard();

  const utilization = useMemo(() => buildUtilization(data.appointments), [data.appointments]);
  const { past, active, future } = useMemo(
    () => classifyAppointments(data.appointments),
    [data.appointments],
  );

  const completedCount = data.appointments.filter((a) => a.status === "completed").length;
  const sessionsPct =
    data.kpis.todayAppointments > 0
      ? Math.round((completedCount / data.kpis.todayAppointments) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white border border-border" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-white border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {source === "fallback" && error ? (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Showing sample data</p>
            <p className="mt-0.5 text-amber-700">{error}</p>
          </div>
        </section>
      ) : null}

      {/* ── KPI STRIP ──────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Sessions progress — spans full row on mobile, first col on sm+ */}
        <article className="rounded-xl border border-border bg-white p-5 shadow-card">
          <p className="text-[13px] font-medium text-muted-foreground">Sessions Today</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {completedCount}
            <span className="text-lg text-muted-foreground">/{data.kpis.todayAppointments}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-stone-100">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${sessionsPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              {sessionsPct}%
            </span>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-white p-5 shadow-card">
          <p className="text-[13px] font-medium text-muted-foreground">Active Patients</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {data.kpis.activePatients}
          </p>
          <TrendBadge
            value={data.trends.activePatients.value}
            direction={data.trends.activePatients.direction}
          />
        </article>

        <article className="rounded-xl border border-border bg-white p-5 shadow-card">
          <p className="text-[13px] font-medium text-muted-foreground">Missed (7d)</p>
          <p
            className={`mt-1 text-3xl font-semibold tracking-tight ${
              data.kpis.missedSessions > 3 ? "text-danger" : "text-foreground"
            }`}
          >
            {data.kpis.missedSessions}
          </p>
          <TrendBadge
            value={data.trends.missedSessions.value}
            direction={data.trends.missedSessions.direction}
            invert
          />
        </article>
      </section>

      {/* ── QUICK ACTIONS ─────────────────────────────────── */}
      <section className="flex flex-wrap gap-2.5">
        {can("manage_appointments") ? (
          <Link
            to="/appointments"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <CalendarPlus className="h-4 w-4" />
            New Appointment
          </Link>
        ) : null}
        {can("manage_patients") ? (
          <Link
            to="/patients?new=1"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Link>
        ) : null}
        {can("manage_billing") ? (
          <Link
            to="/billing"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Link>
        ) : null}
      </section>

      {/* ── MAIN CONTENT GRID ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">

        {/* Left column — schedule + utilization */}
        <div className="space-y-6">

          {/* ── STAFF UTILIZATION ─────────────────────────────
              Horizontal bar per staff member.
              Green > 80%, yellow 50–80%, red < 50%.
              Sessions done / total visible inline. */}
          {utilization.length > 0 ? (
            <section className="rounded-xl border border-border bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[15px] font-semibold text-foreground">Staff Utilization</h2>
              </div>
              <p className="mt-0.5 ml-6 text-sm text-muted-foreground">
                Sessions completed today per therapist.
              </p>

              <div className="mt-4 space-y-3">
                {utilization.map((therapist) => {
                  const barColor =
                    therapist.pct >= 80
                      ? "bg-emerald-500"
                      : therapist.pct >= 50
                        ? "bg-amber-400"
                        : "bg-rose-400";

                  return (
                    <div key={therapist.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{therapist.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {therapist.done}/{therapist.total}
                          {therapist.missed > 0 ? (
                            <span className="ml-1.5 text-rose-500">·{therapist.missed} missed</span>
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-stone-100">
                          <div
                            className={`h-2 rounded-full transition-all ${barColor}`}
                            style={{ width: `${therapist.pct}%` }}
                          />
                        </div>
                        <span
                          className={`w-8 text-right text-[11px] font-semibold tabular-nums ${
                            therapist.pct >= 80
                              ? "text-emerald-600"
                              : therapist.pct >= 50
                                ? "text-amber-600"
                                : "text-rose-500"
                          }`}
                        >
                          {therapist.pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* ── TODAY'S SCHEDULE — TIME-AS-SPINE ─────────────
              Past fades (opacity 0.45), present bright, future muted.
              Pulsing NOW indicator anchors where we are in the day. */}
          <section className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Today&apos;s Schedule</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {completedCount} done · {(active ? 1 : 0) + future.length} remaining
                </p>
              </div>
              {source === "live" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500">
                  Demo
                </span>
              )}
            </div>

            {data.appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <CalendarPlus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">No appointments today</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a booking to start the schedule.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* Past — faded */}
                {past.map((appt) => (
                  <ScheduleRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="past" />
                ))}

                {/* NOW indicator — only shown if there's a past and a present/future */}
                {past.length > 0 && (active || future.length > 0) ? (
                  <div className="flex items-center gap-3 px-5 py-1.5">
                    <span className="now-pulse h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Now</span>
                    <span className="h-px flex-1 bg-primary/25" />
                  </div>
                ) : null}

                {/* Active — bright */}
                {active ? (
                  <ScheduleRow appointment={active} phase="active" />
                ) : null}

                {/* Future — muted */}
                {future.map((appt) => (
                  <ScheduleRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="future" />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column — alerts + patient overview */}
        <div className="space-y-6">

          {/* ── SMART ALERTS ──────────────────────────────────
              Specific and actionable, not generic.
              Color encodes urgency: red = act now, yellow = watch, green = all clear. */}
          <section className="rounded-xl border border-border bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-[15px] font-semibold text-foreground">Alerts</h2>
            </div>
            <p className="mt-0.5 ml-6 text-sm text-muted-foreground">
              Priority items before the day closes.
            </p>

            <div className="mt-4 space-y-2.5">
              {data.attentionItems.map((item) => {
                const route = attentionRoutes[item.badge] ?? "/";
                const borderClass = attentionBorderStyles[item.tone] ?? "border-l-stone-300";
                const iconClass = alertIconColor[item.tone] ?? "text-stone-400";

                return (
                  <div
                    key={item.title}
                    className={`rounded-lg border border-border border-l-[3px] bg-background p-3.5 ${borderClass}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <StatusBadge label={item.badge} tone={item.tone} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.detail}
                        </p>
                        <Link
                          to={route}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Take action
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── PATIENT OVERVIEW ──────────────────────────────
              Status mix + recently added patients. */}
          <section className="rounded-xl border border-border bg-white p-5 shadow-card">
            <h2 className="text-[15px] font-semibold text-foreground">Patient Overview</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Current mix and newest records.</p>

            {/* Status bars */}
            <div className="mt-4 space-y-2.5">
              {data.patientStatuses.map((stage) => {
                const total = data.patientStatuses.reduce((s, p) => s + p.count, 0);
                const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
                const barColor =
                  stage.tone === "green"
                    ? "bg-emerald-500"
                    : stage.tone === "blue"
                      ? "bg-sky-500"
                      : "bg-rose-400";

                return (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-foreground">{stage.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {stage.count} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                      <div
                        className={`h-1.5 rounded-full ${barColor} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent patients */}
            {data.recentPatients.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-[13px] font-semibold text-muted-foreground">Recently added</p>
                <div className="mt-2 space-y-1.5">
                  {data.recentPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{patient.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{patient.createdLabel}</p>
                      </div>
                      <StatusBadge
                        label={patient.status}
                        tone={
                          patient.status === "active"
                            ? "green"
                            : patient.status === "completed"
                              ? "blue"
                              : "red"
                        }
                      />
                    </div>
                  ))}
                </div>
                <Link
                  to="/patients"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  View all patients
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function TrendBadge({
  value,
  direction,
  suffix,
  invert = false,
}: {
  value: string;
  direction: "up" | "down";
  suffix?: string;
  invert?: boolean;
}) {
  // For missed sessions, down is good
  const isPositive = invert ? direction === "down" : direction === "up";

  return (
    <p className={`mt-1.5 text-[12px] font-medium ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
      {direction === "up" ? "↑" : "↓"} {value}
      {suffix ? <span className="ml-1 text-muted-foreground font-normal">{suffix}</span> : null}
    </p>
  );
}

function ScheduleRow({
  appointment,
  phase,
}: {
  appointment: DashboardAppointmentItem;
  phase: "past" | "active" | "future";
}) {
  const borderColor =
    appointment.status === "completed"
      ? "border-l-emerald-400"
      : appointment.status === "missed"
        ? "border-l-rose-400"
        : appointment.status === "cancelled"
          ? "border-l-stone-300"
          : phase === "active"
            ? "border-l-primary"
            : "border-l-sky-300";

  const phaseStyle =
    phase === "past"
      ? "opacity-45"
      : phase === "future"
        ? "opacity-70"
        : "bg-primary/[0.02]";

  return (
    <Link
      to={`/patients/${appointment.patientId}`}
      className={`flex min-h-[3.25rem] items-center gap-4 border-l-[3px] px-5 py-2.5 transition-colors hover:bg-background ${borderColor} ${phaseStyle}`}
    >
      <span className="shrink-0 rounded-md bg-primary/8 px-2.5 py-1 text-sm font-semibold tabular-nums text-primary">
        {appointment.time}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {appointment.patientName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
}
