import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  CalendarDays,
  Phone,
  Search,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import {
  useTherapists,
  type CreateTherapistInput,
  type TherapistMutationInput,
} from "@/hooks/useTherapists";
import { usePatients } from "@/hooks/usePatients";
import { addDays, cn, formatDate, formatRelativeTime, formatTime, startOfDay } from "@/lib/utils";
import type {
  AppointmentStatus,
  PatientRow,
  StatusTone,
  TherapistRow,
  TherapistStatus,
} from "@/types";

const therapistFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  specialization: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

const statusFilters = [
  { key: "all", label: "All" },
  { key: "active", label: "Active", tone: "green" },
  { key: "inactive", label: "Inactive", tone: "red" },
] as const;

type TherapistFormInput = z.input<typeof therapistFormSchema>;
type TherapistFormValues = z.output<typeof therapistFormSchema>;
type StatusFilter = (typeof statusFilters)[number]["key"];

interface TherapistMetrics {
  activePatients: number;
  nextAppointmentAt: string | null;
  totalPatients: number;
  upcomingAppointments: number;
}

function fieldClassName(hasError: boolean) {
  return cn(
    "mt-2 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
    hasError
      ? "border-danger/40 ring-2 ring-danger/10"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
  );
}

function actionButtonClassName(variant: "primary" | "secondary") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variant === "primary" && "bg-primary text-white hover:bg-primary/90",
    variant === "secondary" &&
      "border border-border bg-surface text-foreground hover:bg-background",
  );
}

function getTherapistStatusTone(status: TherapistStatus | null | undefined): StatusTone {
  return status === "inactive" ? "red" : "green";
}

function isUpcomingAppointmentStatus(status: AppointmentStatus | null) {
  return status !== "cancelled" && status !== "completed" && status !== "missed";
}

function buildTherapistMetrics(
  therapist: TherapistRow,
  patients: PatientRow[],
  appointments: ReturnType<typeof useAppointments>["appointments"],
): TherapistMetrics {
  const now = new Date();
  const weekEnd = addDays(startOfDay(now), 7);

  const assignedPatients = patients.filter(
    (patient) => patient.assigned_therapist === therapist.id,
  );
  const activePatients = assignedPatients.filter(
    (patient) => (patient.status ?? "active") === "active",
  ).length;

  const therapistAppointments = appointments
    .filter((appointment) => appointment.therapist_id === therapist.id)
    .sort(
      (left, right) =>
        new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
    );

  const upcomingAppointments = therapistAppointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return (
      scheduledAt >= now &&
      scheduledAt < weekEnd &&
      isUpcomingAppointmentStatus(appointment.status ?? "scheduled")
    );
  });

  const nextAppointment = therapistAppointments.find((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return scheduledAt >= now && isUpcomingAppointmentStatus(appointment.status ?? "scheduled");
  });

  return {
    activePatients,
    nextAppointmentAt: nextAppointment?.scheduled_at ?? null,
    totalPatients: assignedPatients.length,
    upcomingAppointments: upcomingAppointments.length,
  };
}

function TherapistMetricsStrip({
  activeTherapists,
  clinicCaseload,
  totalTherapists,
  upcomingAppointments,
}: {
  activeTherapists: number;
  clinicCaseload: number;
  totalTherapists: number;
  upcomingAppointments: number;
}) {
  const cards = [
    {
      icon: Stethoscope,
      label: "Therapists",
      tone: "text-primary bg-primary/10",
      value: totalTherapists.toString(),
    },
    {
      icon: Activity,
      label: "Active Today",
      tone: "text-success bg-success/10",
      value: activeTherapists.toString(),
    },
    {
      icon: Users,
      label: "Active Caseload",
      tone: "text-blue-600 bg-blue-50",
      value: clinicCaseload.toString(),
    },
    {
      icon: CalendarDays,
      label: "Upcoming 7 Days",
      tone: "text-indigo-600 bg-indigo-50",
      value: upcomingAppointments.toString(),
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-lg border border-border bg-surface p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[28px] font-semibold leading-none tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="mt-3 text-sm font-medium text-muted-foreground">{card.label}</p>
            </div>
            <span
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                card.tone,
              )}
            >
              <card.icon className="h-5 w-5" />
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}

function TherapistsGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`therapist-stat-${index}`}
            className="h-28 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`therapist-card-${index}`}
            className="h-56 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

function TherapistCard({
  metrics,
  onOpen,
  therapist,
}: {
  metrics: TherapistMetrics;
  onOpen: () => void;
  therapist: TherapistRow;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-border bg-surface p-5 text-left shadow-card transition-colors hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{therapist.name}</h3>
            <StatusBadge
              label={therapist.status ?? "active"}
              tone={getTherapistStatusTone(therapist.status)}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {therapist.specialization?.trim() || "General physiotherapy"}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Stethoscope className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active Patients
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">{metrics.activePatients}</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Upcoming
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {metrics.upcomingAppointments}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0" />
          <span>{therapist.phone?.trim() || "Phone not added yet"}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            {metrics.nextAppointmentAt
              ? `Next appointment ${formatRelativeTime(metrics.nextAppointmentAt)}`
              : "No upcoming appointment scheduled"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>{metrics.totalPatients} total patient{metrics.totalPatients === 1 ? "" : "s"}</span>
        <span>{therapist.created_at ? formatDate(therapist.created_at) : "Recently added"}</span>
      </div>
    </button>
  );
}

function AddTherapistModal({
  isSaving,
  onClose,
  onSubmit,
  open,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: TherapistFormValues) => Promise<void>;
  open: boolean;
}) {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<TherapistFormInput, undefined, TherapistFormValues>({
    resolver: zodResolver(therapistFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      specialization: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        phone: "",
        specialization: "",
        status: "active",
      });
    }
  }, [open, reset]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close add therapist dialog"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <section className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Add Therapist</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Add a therapist to start assigning patients and appointments.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
            <label className="text-sm font-medium text-foreground">
              Full Name
              <input
                {...register("name")}
                type="text"
                placeholder="Dr. Tania Sultana"
                className={fieldClassName(Boolean(errors.name))}
              />
              {errors.name?.message ? (
                <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
              ) : null}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">
                Phone
                <input
                  {...register("phone")}
                  type="text"
                  placeholder="01XXXXXXXXX"
                  className={fieldClassName(Boolean(errors.phone))}
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Status
                <select
                  {...register("status")}
                  className={fieldClassName(Boolean(errors.status))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <label className="text-sm font-medium text-foreground">
              Specialization
              <input
                {...register("specialization")}
                type="text"
                placeholder="Musculoskeletal rehab"
                className={fieldClassName(Boolean(errors.specialization))}
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className={actionButtonClassName("secondary")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={actionButtonClassName("primary")}
              >
                {isSaving ? "Adding..." : "Add Therapist"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

function TherapistDetailDrawer({
  canEdit,
  isSaving,
  metrics,
  onClose,
  onSubmit,
  therapist,
}: {
  canEdit: boolean;
  isSaving: boolean;
  metrics: TherapistMetrics | null;
  onClose: () => void;
  onSubmit: (therapistId: string, values: TherapistFormValues) => Promise<void>;
  therapist: TherapistRow | null;
}) {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<TherapistFormInput, undefined, TherapistFormValues>({
    resolver: zodResolver(therapistFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      specialization: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (!therapist) {
      return;
    }

    reset({
      name: therapist.name,
      phone: therapist.phone ?? "",
      specialization: therapist.specialization ?? "",
      status: therapist.status ?? "active",
    });
  }, [reset, therapist]);

  if (!therapist) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close therapist details"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">{therapist.name}</h3>
              <StatusBadge
                label={therapist.status ?? "active"}
                tone={getTherapistStatusTone(therapist.status)}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {therapist.specialization?.trim() || "General physiotherapy"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form
            id="therapist-detail-form"
            onSubmit={handleSubmit((values) => onSubmit(therapist.id, values))}
            className="space-y-4"
          >
            <label className="text-sm font-medium text-foreground">
              Full Name
              <input
                {...register("name")}
                type="text"
                disabled={!canEdit}
                className={fieldClassName(Boolean(errors.name))}
              />
              {errors.name?.message ? (
                <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
              ) : null}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">
                Phone
                <input
                  {...register("phone")}
                  type="text"
                  disabled={!canEdit}
                  className={fieldClassName(Boolean(errors.phone))}
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Status
                <select
                  {...register("status")}
                  disabled={!canEdit}
                  className={fieldClassName(Boolean(errors.status))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <label className="text-sm font-medium text-foreground">
              Specialization
              <input
                {...register("specialization")}
                type="text"
                disabled={!canEdit}
                className={fieldClassName(Boolean(errors.specialization))}
              />
            </label>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active Patients
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metrics?.activePatients ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Upcoming 7 Days
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metrics?.upcomingAppointments ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Assigned Patients
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metrics?.totalPatients ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next Appointment
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {metrics?.nextAppointmentAt
                  ? `${formatTime(metrics.nextAppointmentAt)} on ${formatDate(metrics.nextAppointmentAt)}`
                  : "No upcoming appointment"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Added
            </p>
            <p className="mt-2 text-sm text-foreground">
              {therapist.created_at ? formatRelativeTime(therapist.created_at) : "Recently"}
            </p>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={actionButtonClassName("secondary")}
            >
              Close
            </button>
            {canEdit ? (
              <button
                type="submit"
                form="therapist-detail-form"
                disabled={isSaving}
                className={actionButtonClassName("primary")}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}

export function Therapists() {
  const { can } = useAuth();
  const {
    createTherapist,
    error: therapistsError,
    isLoading: therapistsLoading,
    therapists,
    updateTherapist,
  } = useTherapists();
  const { patients, error: patientsError, isLoading: patientsLoading } = usePatients();
  const {
    appointments,
    error: appointmentsError,
    isLoading: appointmentsLoading,
  } = useAppointments();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatingTherapist, setIsCreatingTherapist] = useState(false);
  const [isSavingTherapist, setIsSavingTherapist] = useState(false);

  const metricsByTherapistId = useMemo(() => {
    return new Map(
      therapists.map((therapist) => [
        therapist.id,
        buildTherapistMetrics(therapist, patients, appointments),
      ]),
    );
  }, [appointments, patients, therapists]);

  const selectedTherapist =
    therapists.find((therapist) => therapist.id === selectedTherapistId) ?? null;

  const filteredTherapists = useMemo(() => {
    let items = therapists;

    if (statusFilter !== "all") {
      items = items.filter((therapist) => (therapist.status ?? "active") === statusFilter);
    }

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      items = items.filter((therapist) => {
        return (
          therapist.name.toLowerCase().includes(normalizedQuery) ||
          (therapist.phone?.toLowerCase().includes(normalizedQuery) ?? false) ||
          (therapist.specialization?.toLowerCase().includes(normalizedQuery) ?? false)
        );
      });
    }

    return items;
  }, [searchQuery, statusFilter, therapists]);

  const counts = useMemo(() => {
    return {
      active: therapists.filter((therapist) => (therapist.status ?? "active") === "active")
        .length,
      all: therapists.length,
      inactive: therapists.filter((therapist) => therapist.status === "inactive").length,
    };
  }, [therapists]);

  const clinicStats = useMemo(() => {
    const now = new Date();
    const weekEnd = addDays(startOfDay(now), 7);

    const activeTherapists = therapists.filter(
      (therapist) => (therapist.status ?? "active") === "active",
    ).length;
    const clinicCaseload = patients.filter((patient) => (patient.status ?? "active") === "active")
      .length;
    const upcomingAppointments = appointments.filter((appointment) => {
      const scheduledAt = new Date(appointment.scheduled_at);

      return (
        scheduledAt >= now &&
        scheduledAt < weekEnd &&
        isUpcomingAppointmentStatus(appointment.status ?? "scheduled")
      );
    }).length;

    return {
      activeTherapists,
      clinicCaseload,
      totalTherapists: therapists.length,
      upcomingAppointments,
    };
  }, [appointments, patients, therapists]);

  async function handleAddTherapist(values: TherapistFormValues) {
    setIsCreatingTherapist(true);

    const input: CreateTherapistInput = {
      name: values.name,
      phone: values.phone,
      specialization: values.specialization,
      status: values.status,
    };

    const result = await createTherapist(input);
    setIsCreatingTherapist(false);

    if (result.error) {
      toast({
        title: "Could not add therapist",
        description: result.error,
        variant: "error",
      });
      return;
    }

    setIsAddModalOpen(false);
    if (result.therapistId) {
      setSelectedTherapistId(result.therapistId);
    }

    toast({
      title: "Therapist added",
      description: "The new therapist is ready for patient and appointment assignment.",
      variant: "success",
    });
  }

  async function handleSaveTherapist(
    therapistId: string,
    values: TherapistFormValues,
  ) {
    setIsSavingTherapist(true);

    const input: TherapistMutationInput = {
      name: values.name,
      phone: values.phone,
      specialization: values.specialization,
      status: values.status,
    };

    const result = await updateTherapist(therapistId, input);
    setIsSavingTherapist(false);

    if (result.error) {
      toast({
        title: "Could not save therapist",
        description: result.error,
        variant: "error",
      });
      return;
    }

    toast({
      title: "Therapist updated",
      description: "The therapist profile has been updated.",
      variant: "success",
    });
  }

  const isLoading = therapistsLoading || patientsLoading || appointmentsLoading;
  const hasError = Boolean(therapistsError || patientsError || appointmentsError);
  const canManageTherapists = can("manage_therapists");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Therapists"
        description="Manage your therapist roster, review live workload, and keep assignments aligned with the clinic schedule."
        actions={canManageTherapists ? (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={actionButtonClassName("primary")}
          >
            <UserPlus className="h-4 w-4" />
            Add Therapist
          </button>
        ) : undefined}
      />

      {hasError ? (
        <section className="rounded-lg border border-danger/20 bg-danger/5 p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground">
            Therapist data could not load cleanly
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {therapistsError ?? patientsError ?? appointmentsError}
          </p>
        </section>
      ) : null}

      {isLoading ? (
        <TherapistsGridSkeleton />
      ) : (
        <>
          <TherapistMetricsStrip {...clinicStats} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 shadow-sm">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    statusFilter === filter.key
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                      statusFilter === filter.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {counts[filter.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, phone, specialization..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-80"
              />
            </div>
          </div>

          {therapists.length === 0 ? (
            <section className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-card">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Stethoscope className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-foreground">No therapists yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Start by adding your first therapist so patients and appointments can be assigned
                across the clinic.
              </p>
              {canManageTherapists ? (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className={cn(actionButtonClassName("primary"), "mt-5")}
                >
                  <UserPlus className="h-4 w-4" />
                  Add your first therapist
                </button>
              ) : null}
            </section>
          ) : filteredTherapists.length === 0 ? (
            <section className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-card">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Search className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-foreground">No therapists match</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Try adjusting the search or switching the status filter.
              </p>
            </section>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {filteredTherapists.map((therapist) => (
                <TherapistCard
                  key={therapist.id}
                  therapist={therapist}
                  metrics={
                    metricsByTherapistId.get(therapist.id) ?? {
                      activePatients: 0,
                      nextAppointmentAt: null,
                      totalPatients: 0,
                      upcomingAppointments: 0,
                    }
                  }
                  onOpen={() => setSelectedTherapistId(therapist.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddTherapistModal
        open={canManageTherapists && isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTherapist}
        isSaving={isCreatingTherapist}
      />

      <TherapistDetailDrawer
        canEdit={canManageTherapists}
        therapist={selectedTherapist}
        metrics={
          selectedTherapist ? (metricsByTherapistId.get(selectedTherapist.id) ?? null) : null
        }
        onClose={() => setSelectedTherapistId(null)}
        onSubmit={handleSaveTherapist}
        isSaving={isSavingTherapist}
      />
    </div>
  );
}
