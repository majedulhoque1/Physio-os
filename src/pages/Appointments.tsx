import { CalendarDays, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { BookAppointmentModal, type AppointmentFormValues } from "@/components/shared/BookAppointmentModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useTherapists } from "@/hooks/useTherapists";
import { cn, formatDate, formatTime, addDays, startOfDay } from "@/lib/utils";
import type { AppointmentStatus, AppointmentWithRelations, StatusTone } from "@/types";

type TabKey = "all" | "today" | "upcoming" | "past";

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

const statusOptions: { label: string; value: AppointmentStatus }[] = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Missed", value: "missed" },
  { label: "Cancelled", value: "cancelled" },
];

function getStatusTone(status: AppointmentStatus | null): StatusTone {
  switch (status) {
    case "scheduled":
      return "blue";
    case "confirmed":
      return "indigo";
    case "completed":
      return "green";
    case "missed":
      return "orange";
    case "cancelled":
      return "red";
    default:
      return "gray";
  }
}

function filterByTab(appointments: AppointmentWithRelations[], tab: TabKey) {
  const todayStart = startOfDay();
  const todayEnd = addDays(todayStart, 1);

  switch (tab) {
    case "today":
      return appointments.filter((apt) => {
        const d = new Date(apt.scheduled_at);
        return d >= todayStart && d < todayEnd;
      });
    case "upcoming":
      return appointments.filter((apt) => new Date(apt.scheduled_at) >= todayEnd);
    case "past":
      return appointments.filter((apt) => new Date(apt.scheduled_at) < todayStart);
    default:
      return appointments;
  }
}

function groupByDate(appointments: AppointmentWithRelations[]) {
  const groups: Map<string, AppointmentWithRelations[]> = new Map();
  for (const apt of appointments) {
    const key = formatDate(apt.scheduled_at);
    const existing = groups.get(key) ?? [];
    existing.push(apt);
    groups.set(key, existing);
  }
  return groups;
}

function AppointmentRow({
  appointment,
  onStatusChange,
}: {
  appointment: AppointmentWithRelations;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const patientName = appointment.patients?.name ?? "Unknown patient";
  const therapistName = appointment.therapists?.name ?? "Unassigned";
  const status = appointment.status ?? "scheduled";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-card transition-shadow hover:shadow-elevated sm:flex-row sm:items-center sm:gap-4">
      <div className="shrink-0 text-center sm:w-20">
        <p className="text-lg font-semibold text-foreground tabular-nums">
          {formatTime(appointment.scheduled_at)}
        </p>
        <p className="text-xs text-muted-foreground">
          {appointment.duration_mins ?? 45} min
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{patientName}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{therapistName}</p>
        {appointment.session_number ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Session #{appointment.session_number}
          </p>
        ) : null}
        {appointment.notes ? (
          <p className="mt-1 truncate text-xs italic text-muted-foreground">
            {appointment.notes}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge label={status} tone={getStatusTone(status)} />
        <select
          value={status}
          onChange={(e) => onStatusChange(appointment.id, e.target.value as AppointmentStatus)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((g) => (
        <div key={g} className="space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-border bg-white p-4"
            >
              <div className="h-12 w-20 animate-pulse rounded bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Appointments() {
  const { can } = useAuth();
  const { appointments, error, isLoading, createAppointment, updateAppointmentStatus } =
    useAppointments();
  const { patients } = usePatients();
  const { therapists } = useTherapists();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canManageAppointments = can("manage_appointments");

  const filtered = filterByTab(appointments, activeTab);
  const grouped = groupByDate(filtered);

  async function handleBookAppointment(values: AppointmentFormValues) {
    setIsSaving(true);

    const scheduledAt = new Date(`${values.date}T${values.time}:00`).toISOString();

    const result = await createAppointment({
      duration_mins: values.duration_mins,
      notes: values.notes || null,
      patient_id: values.patient_id,
      scheduled_at: scheduledAt,
      session_number: values.session_number ? parseInt(values.session_number, 10) : null,
      therapist_id: values.therapist_id,
    });

    setIsSaving(false);

    if (result.error) {
      toast({ title: "Could not book appointment", description: result.error, variant: "error" });
      return;
    }

    setIsModalOpen(false);
    toast({
      title: "Appointment booked",
      description: "The session is now on the schedule.",
      variant: "success",
    });
  }

  async function handleStatusChange(appointmentId: string, status: AppointmentStatus) {
    const result = await updateAppointmentStatus(appointmentId, status);

    if (result.error) {
      toast({
        title: "Could not update status",
        description: result.error,
        variant: "error",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="View and manage all scheduled sessions across the clinic."
        actions={canManageAppointments ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <CalendarPlus className="h-4 w-4" />
            Book Appointment
          </button>
        ) : undefined}
      />

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground">Failed to load appointments</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{error}</p>
        </section>
      ) : null}

      <div className="flex gap-1 rounded-xl border border-border bg-white p-1 shadow-card">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? appointments.length
              : filterByTab(appointments, tab.key).length;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {tab.label}
              {count > 0 ? (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <AppointmentsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`No ${activeTab === "all" ? "" : activeTab + " "}appointments`}
          description={
            activeTab === "all"
              ? "Book the first session to get started."
              : `No appointments in this time window.`
          }
        />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dateLabel, apts]) => (
            <div key={dateLabel} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{dateLabel}</h3>
              {apts.map((apt) => (
                <AppointmentRow
                  key={apt.id}
                  appointment={apt}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <BookAppointmentModal
        open={canManageAppointments && isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookAppointment}
        patients={patients}
        therapists={therapists}
        isSaving={isSaving}
      />
    </div>
  );
}
