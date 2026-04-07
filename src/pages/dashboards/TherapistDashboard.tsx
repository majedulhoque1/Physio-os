import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardEdit,
  Clock,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAppointments } from "@/hooks/useAppointments";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardAppointmentItem } from "@/types";

function classifySessions(appointments: DashboardAppointmentItem[]) {
  const past: DashboardAppointmentItem[] = [];
  const future: DashboardAppointmentItem[] = [];
  let current: DashboardAppointmentItem | null = null;
  let next: DashboardAppointmentItem | null = null;

  for (const appt of appointments) {
    if (appt.status === "completed" || appt.status === "missed" || appt.status === "cancelled") {
      past.push(appt);
    } else if (!current) {
      current = appt;
    } else if (!next) {
      next = appt;
      future.push(appt);
    } else {
      future.push(appt);
    }
  }

  return { past, current, next, future };
}

export function TherapistDashboard() {
  const { data, isLoading, refreshDashboard } = useDashboard();
  const { updateAppointmentStatus } = useAppointments();
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);

  async function handleCompleteSession(appointmentId: string) {
    if (!appointmentId || appointmentId.startsWith("demo-")) return;
    setIsCompleting(true);
    const result = await updateAppointmentStatus(appointmentId, "completed");
    setIsCompleting(false);

    if (result.error) {
      toast({ title: "Could not complete session", description: result.error, variant: "error" });
      return;
    }

    toast({ title: "Session completed", description: "Great work!", variant: "success" });
    refreshDashboard();
  }

  const { past, current, next, future } = useMemo(
    () => classifySessions(data.appointments),
    [data.appointments],
  );

  const completedCount = past.filter((a) => a.status === "completed").length;
  const totalSessions = data.appointments.length;
  const remainingCount = (current ? 1 : 0) + future.length;
  const progressPct = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-xl bg-white border border-border" />
        <div className="h-48 animate-pulse rounded-xl bg-white border border-border" />
      </div>
    );
  }

  // All sessions done — show completion state
  if (!current && totalSessions > 0) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Day complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} session{completedCount !== 1 ? "s" : ""} completed today.
          </p>
        </section>
        <SessionTimeline appointments={past} label="Today's sessions" />
      </div>
    );
  }

  // No sessions at all
  if (totalSessions === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary">
            <Clock className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No sessions today</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enjoy your day off.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── CURRENT SESSION — dominates the screen ─────────
          Large patient name (22px+). The single most important
          thing the therapist sees when they glance up. */}
      {current ? (
        <section className="rounded-2xl border-2 border-primary/20 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="now-pulse h-2.5 w-2.5 rounded-full bg-primary" />
            Current session
          </div>

          <Link
            to={`/patients/${current.patientId}`}
            className="mt-4 block"
          >
            <p className="text-[22px] font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
              {current.patientName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.time} &middot; {current.therapist}
            </p>
          </Link>

          {/* Session progress bar — visual indicator of day progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Day progress</span>
              <span className="font-semibold tabular-nums">
                {completedCount} of {totalSessions} done
              </span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-stone-100">
              <div
                className="h-2.5 rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Action buttons — large tap targets (48×48 min), physio hands may be busy */}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={isCompleting}
              onClick={() => handleCompleteSession(current.appointmentId)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-60 sm:text-base"
            >
              {isCompleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {isCompleting ? "Completing..." : "Complete Session"}
            </button>
            <Link
              to={`/patients/${current.patientId}`}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary"
            >
              <ClipboardEdit className="h-4 w-4" />
              <span className="hidden sm:inline">Add Note</span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* ── NEXT UP — preview of the next patient ─────────
          Therapist's 2-3 minute gap question:
          "Who's next? What's their story? Am I running late?" */}
      {next ? (
        <Link
          to={`/patients/${next.patientId}`}
          className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-card transition-all hover:border-primary/20 hover:shadow-elevated"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xs font-bold text-sky-600">
            NEXT
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">{next.patientName}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {next.time} &middot; {next.therapist}
            </p>
          </div>
          <StatusBadge label={next.status} tone="blue" />
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      {/* ── REST OF DAY ─────────────────────────────────────
          Time-as-spine: past faded, future muted.
          Compact list — therapist just needs a glance. */}
      {(past.length > 0 || future.length > 1) ? (
        <section className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Full day &middot; {remainingCount} remaining
            </h2>
          </div>

          <div>
            {/* Past — faded */}
            {past.map((appt) => (
              <TimelineRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="past" />
            ))}

            {/* NOW marker */}
            {past.length > 0 ? (
              <div className="flex items-center gap-3 px-5 py-1">
                <span className="now-pulse h-2 w-2 rounded-full bg-primary" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Now</span>
                <span className="h-px flex-1 bg-primary/25" />
              </div>
            ) : null}

            {/* Current — highlighted */}
            {current ? (
              <TimelineRow appointment={current} phase="active" />
            ) : null}

            {/* Future — muted */}
            {future.map((appt) => (
              <TimelineRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="future" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function TimelineRow({
  appointment,
  phase,
}: {
  appointment: DashboardAppointmentItem;
  phase: "past" | "active" | "future";
}) {
  const phaseStyle =
    phase === "past"
      ? "opacity-45"
      : phase === "future"
        ? "opacity-70"
        : "bg-primary/[0.03]";

  const borderColor =
    appointment.status === "completed"
      ? "border-l-emerald-400"
      : appointment.status === "missed"
        ? "border-l-rose-400"
        : phase === "active"
          ? "border-l-primary"
          : "border-l-sky-300";

  return (
    <Link
      to={`/patients/${appointment.patientId}`}
      className={`flex min-h-[2.75rem] items-center gap-3 border-l-[3px] px-5 py-2 transition-colors hover:bg-background ${borderColor} ${phaseStyle}`}
    >
      <span className="shrink-0 text-sm font-semibold tabular-nums text-primary/80">
        {appointment.time}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {appointment.patientName}
      </span>
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
        className="text-[10px]"
      />
    </Link>
  );
}

function SessionTimeline({
  appointments,
  label,
}: {
  appointments: DashboardAppointmentItem[];
  label: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </h2>
      </div>
      <div>
        {appointments.map((appt) => (
          <TimelineRow key={`${appt.patientId}-${appt.time}`} appointment={appt} phase="past" />
        ))}
      </div>
    </section>
  );
}
