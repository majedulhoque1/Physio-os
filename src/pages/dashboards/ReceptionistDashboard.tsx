import { useMemo } from "react";
import {
  CalendarPlus,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardAppointmentItem } from "@/types";

/**
 * Classify each appointment as past / active / future based on status.
 * "completed" | "missed" | "cancelled" → past
 * First "scheduled" | "confirmed"      → active (the NOW slot)
 * Remaining "scheduled" | "confirmed"  → future
 */
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

/**
 * Extract unique therapists and derive availability:
 * If all their today-appointments are done → free (green)
 * If any are still scheduled/confirmed → busy (red)
 */
function deriveTherapistAvailability(appointments: DashboardAppointmentItem[]) {
  const map = new Map<string, { total: number; done: number }>();

  for (const appt of appointments) {
    const existing = map.get(appt.therapist) ?? { total: 0, done: 0 };
    existing.total++;
    if (appt.status === "completed" || appt.status === "missed" || appt.status === "cancelled") {
      existing.done++;
    }
    map.set(appt.therapist, existing);
  }

  return Array.from(map.entries()).map(([name, counts]) => ({
    name,
    isFree: counts.done >= counts.total,
    remaining: counts.total - counts.done,
  }));
}

export function ReceptionistDashboard() {
  const { data, isLoading } = useDashboard();

  const { past, active, future } = useMemo(
    () => classifyAppointments(data.appointments),
    [data.appointments],
  );

  const therapists = useMemo(
    () => deriveTherapistAvailability(data.appointments),
    [data.appointments],
  );

  const remaining = (active ? 1 : 0) + future.length;
  const completed = data.appointments.filter((a) => a.status === "completed").length;
  const missed = data.appointments.filter((a) => a.status === "missed").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl bg-white border border-border" />
        <div className="h-96 animate-pulse rounded-xl bg-white border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── STICKY GLANCE BAR ─────────────────────────────────
          "Is Dr. X free? How many waiting?" — zero-tap answers.
          This section should never scroll off screen on desktop. */}
      <section className="sticky top-16 z-10 -mx-4 -mt-5 mb-5 border-b border-border bg-white/95 backdrop-blur-md px-4 py-3 sm:-mx-6 sm:px-6 lg:hidden">
        {/* Stat chips */}
        <div className="flex flex-wrap items-center gap-3">
          <GlanceStat
            label="Remaining"
            value={remaining}
            color={remaining > 0 ? "text-sky-700 bg-sky-50" : "text-emerald-700 bg-emerald-50"}
          />
          <GlanceStat
            label="Completed"
            value={completed}
            color="text-emerald-700 bg-emerald-50"
          />
          {missed > 0 ? (
            <GlanceStat
              label="Missed"
              value={missed}
              color="text-rose-700 bg-rose-50"
            />
          ) : null}
          <GlanceStat
            label="Total"
            value={data.kpis.todayAppointments}
            color="text-stone-600 bg-stone-100"
          />

          {/* Divider + therapist chips */}
          <span className="hidden h-6 w-px bg-border sm:block" />

          {therapists.map((t) => (
            <span
              key={t.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <span
                className={`h-2 w-2 rounded-full ${t.isFree ? "bg-emerald-500" : "bg-rose-500 now-pulse"}`}
              />
              {t.name.replace(/^Dr\.\s*/, "")}
              {!t.isFree ? (
                <span className="text-muted-foreground">({t.remaining})</span>
              ) : null}
            </span>
          ))}
        </div>
      </section>

      {/* ── DESKTOP GLANCE BAR ───────────────────────────────────────
          Non-sticky. Appears above the grid on lg+ screens only.
          Same zero-tap answers: stat chips + therapist availability. */}
      <section className="hidden lg:block mb-4 rounded-xl border border-border bg-white px-5 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <GlanceStat
            label="Remaining"
            value={remaining}
            color={remaining > 0 ? "text-sky-700 bg-sky-50" : "text-emerald-700 bg-emerald-50"}
          />
          <GlanceStat
            label="Completed"
            value={completed}
            color="text-emerald-700 bg-emerald-50"
          />
          {missed > 0 ? (
            <GlanceStat
              label="Missed"
              value={missed}
              color="text-rose-700 bg-rose-50"
            />
          ) : null}
          <GlanceStat
            label="Total"
            value={data.kpis.todayAppointments}
            color="text-stone-600 bg-stone-100"
          />

          <span className="h-6 w-px bg-border" />

          {therapists.map((t) => (
            <span
              key={t.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <span
                className={`h-2 w-2 rounded-full ${t.isFree ? "bg-emerald-500" : "bg-rose-500 now-pulse"}`}
              />
              {t.name}
              {!t.isFree ? (
                <span className="text-muted-foreground">({t.remaining} left)</span>
              ) : (
                <span className="text-emerald-600 font-semibold">Free</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* ── MAIN CONTENT: mobile = single column, desktop = 2-column ── */}
      <div className="lg:grid lg:grid-cols-[1fr_252px] lg:gap-5">

        {/* ── TIME-AS-SPINE ─────────────────────────────────────
            Vertical axis = the day's timeline.
            Past fades (opacity 0.45), present bright, future muted. */}
        <section className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
          {data.appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <CalendarPlus className="h-5 w-5" />
              </span>
              <p className="text-base font-semibold text-foreground">No appointments today</p>
              <p className="text-sm text-muted-foreground">Create a booking to start the day.</p>
            </div>
          ) : (
            <div>
              {/* Past appointments — faded */}
              {past.map((appt) => (
                <AppointmentRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="past" />
              ))}

              {/* ── NOW indicator ── */}
              {(active || future.length > 0) && past.length > 0 ? (
                <div className="flex items-center gap-3 px-5 py-1">
                  <span className="now-pulse h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Now</span>
                  <span className="h-px flex-1 bg-primary/25" />
                </div>
              ) : null}

              {/* Active appointment — bright, prominent */}
              {active ? (
                <AppointmentRow appointment={active} phase="active" />
              ) : null}

              {/* Future appointments — slightly muted */}
              {future.map((appt) => (
                <AppointmentRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="future" />
              ))}
            </div>
          )}
        </section>

        {/* ── DESKTOP RIGHT PANEL ───────────────────────────────
            Quick actions + therapist status — sticky below the header.
            Hidden on mobile (action bar handles those). */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 self-start sticky top-28">

          {/* Quick Actions */}
          <section className="rounded-xl border border-border bg-white p-4 shadow-card">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Quick Actions
            </p>
            <div className="flex flex-col gap-2">
              <Link
                to="/appointments"
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >
                <CalendarPlus className="h-4 w-4" />
                + Walk-in
              </Link>
              <Link
                to="/appointments"
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reschedule
              </Link>
              <Link
                to="/billing"
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Record Payment
              </Link>
            </div>
          </section>

          {/* Therapist Status */}
          {therapists.length > 0 ? (
            <section className="rounded-xl border border-border bg-white p-4 shadow-card">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Therapist Status
              </p>
              <div className="space-y-2">
                {therapists.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5"
                  >
                    <span className="truncate text-sm text-foreground">{t.name}</span>
                    {t.isFree ? (
                      <span className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Free
                      </span>
                    ) : (
                      <span className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        <span className="now-pulse h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {t.remaining} left
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Today summary */}
          <section className="rounded-xl border border-border bg-white p-4 shadow-card">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Today
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums text-foreground">{data.kpis.todayAppointments}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold tabular-nums text-emerald-600">{completed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className={`font-semibold tabular-nums ${remaining > 0 ? "text-sky-600" : "text-emerald-600"}`}>{remaining}</span>
              </div>
              {missed > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Missed</span>
                  <span className="font-semibold tabular-nums text-rose-600">{missed}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>

      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="h-16 lg:hidden" />

      {/* ── STICKY BOTTOM ACTION BAR (mobile only) ───────────
          3 buttons: Walk-in (primary), Reschedule, Payment. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-20 border-t border-border bg-white px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2">
          <Link
            to="/appointments"
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white active:scale-[0.97]"
          >
            <CalendarPlus className="h-4 w-4" />
            Walk-in
          </Link>
          <Link
            to="/appointments"
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-medium text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reschedule
          </Link>
          <Link
            to="/billing"
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-medium text-foreground"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Payment
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function GlanceStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      <span className="text-sm tabular-nums">{value}</span>
      {label}
    </span>
  );
}

/**
 * Patient card following the design-principle anatomy:
 * [Time] [Name]                    [Status badge]
 *        [Service · Doctor name]
 *
 * Phase controls visual treatment:
 *   past   → opacity 0.45, non-interactive feel
 *   active → full opacity, bright left border, slight bg highlight
 *   future → slightly muted (opacity 0.75)
 */
function AppointmentRow({
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

  const phaseStyles =
    phase === "past"
      ? "opacity-45"
      : phase === "future"
        ? "opacity-75"
        : "bg-primary/[0.03]";

  return (
    <Link
      to={`/patients/${appointment.patientId}`}
      className={`flex min-h-[3.5rem] items-center gap-4 border-l-[3px] px-5 py-3 transition-colors hover:bg-background ${borderColor} ${phaseStyles}`}
    >
      {/* Time chip — 16px+ for phone readability */}
      <span className="shrink-0 rounded-md bg-primary/8 px-2.5 py-1 text-[15px] font-semibold tabular-nums text-primary sm:text-sm">
        {appointment.time}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-foreground sm:text-sm">
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
