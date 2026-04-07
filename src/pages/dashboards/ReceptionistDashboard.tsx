import { useMemo, useState } from "react";
import { ChevronDown, Search, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AddPatientModal, type PatientCreateValues } from "@/components/patients/AddPatientModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useDashboard } from "@/hooks/useDashboard";
import { usePatients, type CreatePatientInput } from "@/hooks/usePatients";
import { useTherapists } from "@/hooks/useTherapists";
import { cn } from "@/lib/utils";
import type { DashboardAppointmentItem } from "@/types";

export function ReceptionistDashboard() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const { patients, isLoading: patientsLoading, error: patientsError, createPatient } = usePatients();
  const { data: dash, isLoading: scheduleLoading } = useDashboard();
  const { therapists } = useTherapists();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 10);
    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
      .slice(0, 20);
  }, [patients, search]);

  const remaining = dash.appointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed",
  ).length;

  async function handleAddPatient(values: PatientCreateValues) {
    setIsSaving(true);
    const input: CreatePatientInput = {
      age: values.age ?? null,
      assigned_therapist: values.assigned_therapist || null,
      diagnosis: values.diagnosis || null,
      gender: values.gender || null,
      name: values.name,
      phone: values.phone,
      status: values.status,
    };
    const { error } = await createPatient(input);
    setIsSaving(false);
    if (error) {
      toast({ title: "Could not add patient", description: error, variant: "error" });
      return;
    }
    toast({ title: "Patient added", description: "Record is now in your clinic list.", variant: "success" });
    setIsAddOpen(false);
  }

  return (
    <div className="space-y-4">

      {/* ── SEARCH + ADD ─────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name or phone..."
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Patient</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── MAIN GRID: 1-col mobile, 2-col desktop ──────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-4 lg:items-start">

        {/* ── PATIENT LIST ──────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {search.trim() ? `Results for "${search.trim()}"` : "Recent Patients"}
            </p>
            {!search.trim() && (
              <Link
                to="/patients"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            )}
          </div>

          {patientsLoading ? (
            <PatientListSkeleton />
          ) : patientsError ? (
            <p className="px-5 py-8 text-center text-sm text-danger">{patientsError}</p>
          ) : filtered.length === 0 ? (
            <PatientEmptyState
              hasSearch={Boolean(search.trim())}
              onAdd={() => setIsAddOpen(true)}
            />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((patient) => (
                <PatientListRow
                  key={patient.id}
                  id={patient.id}
                  name={patient.name}
                  phone={patient.phone}
                  status={patient.status ?? "active"}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── RIGHT SIDEBAR (desktop only) ─────────────────────── */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4">

          {/* Today's Schedule */}
          <SchedulePanel
            appointments={dash.appointments}
            isLoading={scheduleLoading}
            remaining={remaining}
          />

          {/* Team Members — shows staff added by admin */}
          {therapists.length > 0 && (
            <section className="rounded-xl border border-border bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Team
                </p>
              </div>
              <div className="space-y-2">
                {therapists.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {t.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── TODAY'S SCHEDULE — mobile collapsible ─────────────── */}
        <div className="mt-4 space-y-3 lg:hidden">
          <button
            type="button"
            onClick={() => setScheduleExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-5 py-3 text-left shadow-card"
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Today's Schedule
              {remaining > 0 && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-sky-700">
                  {remaining} left
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                scheduleExpanded && "rotate-180",
              )}
            />
          </button>
          {scheduleExpanded && (
            <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
              <SchedulePanel
                appointments={dash.appointments}
                isLoading={scheduleLoading}
                remaining={remaining}
                showHeader={false}
              />
            </div>
          )}

          {/* Team Members — mobile */}
          {therapists.length > 0 && (
            <section className="rounded-xl border border-border bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Team
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {therapists.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    {t.name}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="h-4 lg:hidden" />

      <AddPatientModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddPatient}
        isSaving={isSaving}
        therapists={therapists}
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function PatientListRow({
  id,
  name,
  phone,
  status,
}: {
  id: string;
  name: string;
  phone: string;
  status: string;
}) {
  const tone =
    status === "active" ? "green" :
    status === "completed" ? "blue" :
    status === "dropped" ? "red" : "gray";

  return (
    <Link
      to={`/patients/${id}`}
      className="flex min-h-[3.25rem] items-center gap-4 px-5 py-3 transition-colors hover:bg-background"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{phone}</p>
      </div>
      <StatusBadge label={status} tone={tone as "green" | "blue" | "red" | "gray"} />
    </Link>
  );
}

function PatientListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-36 animate-pulse rounded bg-border" />
            <div className="h-3 w-24 animate-pulse rounded bg-border/60" />
          </div>
          <div className="h-5 w-14 animate-pulse rounded-full bg-border/60" />
        </div>
      ))}
    </div>
  );
}

function PatientEmptyState({
  hasSearch,
  onAdd,
}: {
  hasSearch: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <UserPlus className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {hasSearch ? "No patients match your search." : "No patients yet."}
      </p>
      {!hasSearch && (
        <button
          type="button"
          onClick={onAdd}
          className="text-sm font-medium text-primary hover:underline"
        >
          Add the first patient →
        </button>
      )}
    </div>
  );
}

function SchedulePanel({
  appointments,
  isLoading,
  remaining,
  showHeader = true,
}: {
  appointments: DashboardAppointmentItem[];
  isLoading: boolean;
  remaining: number;
  showHeader?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today's Schedule
          </p>
          {remaining > 0 && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {remaining} left
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-border" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No appointments today.
        </p>
      ) : (
        <>
          <div className="divide-y divide-border">
            {appointments.slice(0, 8).map((appt) => (
              <ScheduleRow key={`${appt.patientId}-${appt.time}`} appointment={appt} />
            ))}
          </div>
          <div className="border-t border-border px-4 py-2.5 text-right">
            <Link
              to="/appointments"
              className="text-xs font-medium text-primary hover:underline"
            >
              View full schedule →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleRow({ appointment }: { appointment: DashboardAppointmentItem }) {
  const tone =
    appointment.status === "completed" ? "green" :
    appointment.status === "missed" ? "red" :
    appointment.status === "cancelled" ? "gray" : "blue";

  return (
    <Link
      to={`/patients/${appointment.patientId}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-background"
    >
      <span className="shrink-0 rounded bg-primary/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
        {appointment.time}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {appointment.patientName}
      </span>
      <StatusBadge label={appointment.status} tone={tone} />
    </Link>
  );
}
