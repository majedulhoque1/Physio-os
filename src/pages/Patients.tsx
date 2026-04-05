import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpRight,
  CalendarPlus,
  Phone,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { BookAppointmentModal, type AppointmentFormValues } from "@/components/shared/BookAppointmentModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import {
  usePatients,
  type CreatePatientInput,
  type PatientMutationInput,
} from "@/hooks/usePatients";
import { useTherapists } from "@/hooks/useTherapists";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { PatientRow, PatientStatus, StatusTone, TherapistRow } from "@/types";

const statusTabs = [
  { key: "all", label: "All" },
  { key: "active", label: "Active", tone: "green" },
  { key: "completed", label: "Completed", tone: "blue" },
  { key: "dropped", label: "Dropped", tone: "red" },
] as const;

type StatusTab = (typeof statusTabs)[number]["key"];

function getPatientStatusTone(status: PatientStatus | null | undefined): StatusTone {
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

function getProgressColor(completed: number, total: number) {
  if (total === 0) return "bg-slate-200";
  const pct = completed / total;
  if (pct >= 0.75) return "bg-emerald-500";
  if (pct >= 0.25) return "bg-amber-500";
  return "bg-slate-300";
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

function therapistName(therapists: TherapistRow[], therapistId: string | null | undefined) {
  if (!therapistId) return "Unassigned";
  return therapists.find((t) => t.id === therapistId)?.name ?? "Unknown";
}

// --- Drawer form schema ---

const COMMON_DIAGNOSES = [
  "Low back pain",
  "Neck pain / Cervical spondylosis",
  "Knee pain / Osteoarthritis",
  "Shoulder pain / Frozen shoulder",
  "Stroke rehabilitation",
  "Sports injury",
  "Post-surgical rehabilitation",
  "Plantar fasciitis",
  "Sciatica",
  "Rotator cuff injury",
  "Disc herniation",
  "Tennis / Golfer's elbow",
];

const patientEditSchema = z.object({
  assigned_therapist: z.string().optional(),
  diagnosis: z.string().optional(),
  status: z.enum(["active", "completed", "dropped"]),
  total_sessions: z.coerce.number().int().min(0, "Must be 0 or more"),
});

const patientCreateSchema = z.object({
  age: z.coerce.number().int().min(0, "Must be 0 or more").max(120, "Keep it under 120").nullable(),
  assigned_therapist: z.string().optional(),
  diagnosis: z.string().optional(),
  gender: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  status: z.enum(["active", "completed", "dropped"]),
  total_sessions: z.coerce.number().int().min(0, "Must be 0 or more"),
});

type PatientEditFormInput = z.input<typeof patientEditSchema>;
type PatientCreateFormInput = z.input<typeof patientCreateSchema>;
type PatientEditValues = z.output<typeof patientEditSchema>;
type PatientCreateValues = z.output<typeof patientCreateSchema>;

// --- Session progress bar ---

function SessionProgress({
  completed,
  total,
}: {
  completed: number | null;
  total: number | null;
}) {
  const c = completed ?? 0;
  const t = total ?? 0;

  if (t === 0) {
    return <span className="text-xs text-muted-foreground">No plan</span>;
  }

  const pct = Math.min(Math.round((c / t) * 100), 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", getProgressColor(c, t))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {c}/{t}
      </span>
    </div>
  );
}

function AddPatientModal({
  isSaving,
  onClose,
  onSubmit,
  open,
  therapists,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: PatientCreateValues) => Promise<void>;
  open: boolean;
  therapists: TherapistRow[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [diagnosisMode, setDiagnosisMode] = useState<"select" | "custom">("select");

  const {
    handleSubmit,
    register,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<PatientCreateFormInput, undefined, PatientCreateValues>({
    resolver: zodResolver(patientCreateSchema),
    defaultValues: {
      age: null,
      assigned_therapist: "",
      diagnosis: "",
      gender: "",
      name: "",
      phone: "",
      status: "active",
      total_sessions: 0,
    },
  });

  const selectedDiagnosis = watch("diagnosis");

  useEffect(() => {
    if (!open) {
      reset({
        age: null,
        assigned_therapist: "",
        diagnosis: "",
        gender: "",
        name: "",
        phone: "",
        status: "active",
        total_sessions: 0,
      });
      setStep(1);
      setDiagnosisMode("select");
    }
  }, [open, reset]);

  if (!open) return null;

  async function handleContinue() {
    const valid = await trigger(["name", "phone"]);
    if (valid) setStep(2);
  }

  function handleDiagnosisSelect(value: string) {
    if (value === "__other__") {
      setDiagnosisMode("custom");
      setValue("diagnosis", "");
    } else {
      setDiagnosisMode("select");
      setValue("diagnosis", value, { shouldValidate: true });
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close add patient dialog"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <section className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {step === 1 ? "New Patient" : "Clinical Details"}
                </h3>
                <div className="flex gap-1">
                  <span className={cn("h-1.5 w-6 rounded-full", step === 1 ? "bg-primary" : "bg-primary/30")} />
                  <span className={cn("h-1.5 w-6 rounded-full", step === 2 ? "bg-primary" : "bg-border")} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === 1
                  ? "Enter basic info to register the patient."
                  : "Add clinical details — the therapist can update these after assessment."}
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

          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 ? (
              <div className="space-y-4 px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Full Name
                    <input
                      {...register("name")}
                      type="text"
                      placeholder="Patient name"
                      autoFocus
                      className={fieldClassName(Boolean(errors.name))}
                    />
                    {errors.name?.message ? (
                      <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Phone
                    <input
                      {...register("phone")}
                      type="text"
                      placeholder="01XXXXXXXXX"
                      className={fieldClassName(Boolean(errors.phone))}
                    />
                    {errors.phone?.message ? (
                      <span className="mt-1 block text-xs text-danger">{errors.phone.message}</span>
                    ) : null}
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(actionButtonClassName("secondary"), "text-muted-foreground")}
                  >
                    {isSaving ? "Adding..." : "Quick add (no clinical)"}
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    className={actionButtonClassName("primary")}
                  >
                    Add clinical details →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-5 py-5">
                {/* Diagnosis */}
                <div>
                  <p className="text-sm font-medium text-foreground">Diagnosis</p>
                  {diagnosisMode === "select" ? (
                    <select
                      value={selectedDiagnosis && COMMON_DIAGNOSES.includes(selectedDiagnosis) ? selectedDiagnosis : ""}
                      onChange={(e) => handleDiagnosisSelect(e.target.value)}
                      className={cn(fieldClassName(false))}
                    >
                      <option value="">Select a condition...</option>
                      {COMMON_DIAGNOSES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="__other__">Other (type below)</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        {...register("diagnosis")}
                        type="text"
                        placeholder="Type diagnosis..."
                        autoFocus
                        className={cn(fieldClassName(false), "flex-1")}
                      />
                      <button
                        type="button"
                        onClick={() => { setDiagnosisMode("select"); setValue("diagnosis", ""); }}
                        className="mt-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-background"
                      >
                        ← List
                      </button>
                    </div>
                  )}
                </div>

                {/* Age + Gender */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Age
                    <input
                      {...register("age")}
                      type="number"
                      min={0}
                      placeholder="Optional"
                      className={fieldClassName(Boolean(errors.age))}
                      onChange={(e) => {
                        const v = e.target.value;
                        setValue("age", v === "" ? null : Number(v), { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.age?.message ? (
                      <span className="mt-1 block text-xs text-danger">{errors.age.message}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Gender
                    <select {...register("gender")} className={fieldClassName(false)}>
                      <option value="">Prefer not to say</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>

                {/* Therapist + Sessions */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Assigned Therapist
                    <select {...register("assigned_therapist")} className={fieldClassName(false)}>
                      <option value="">Unassigned</option>
                      {therapists.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Total Sessions
                    <input
                      {...register("total_sessions")}
                      type="number"
                      min={0}
                      className={fieldClassName(Boolean(errors.total_sessions))}
                    />
                    {errors.total_sessions?.message ? (
                      <span className="mt-1 block text-xs text-danger">
                        {errors.total_sessions.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={actionButtonClassName("secondary")}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={actionButtonClassName("primary")}
                  >
                    {isSaving ? "Adding..." : "Add Patient"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    </>
  );
}

// --- Patient detail drawer ---

function PatientDetailDrawer({
  canBookAppointments,
  canEdit,
  isSaving,
  onBookAppointment,
  onClose,
  onSubmit,
  patient,
  therapists,
}: {
  canBookAppointments: boolean;
  canEdit: boolean;
  isSaving: boolean;
  onBookAppointment: () => void;
  onClose: () => void;
  onSubmit: (patientId: string, values: PatientEditValues) => Promise<void>;
  patient: PatientRow | null;
  therapists: TherapistRow[];
}) {
  const navigate = useNavigate();
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<PatientEditFormInput, undefined, PatientEditValues>({
    resolver: zodResolver(patientEditSchema),
    defaultValues: {
      assigned_therapist: "",
      diagnosis: "",
      status: "active",
      total_sessions: 0,
    },
  });

  useEffect(() => {
    if (!patient) return;
    reset({
      assigned_therapist: patient.assigned_therapist ?? "",
      diagnosis: patient.diagnosis ?? "",
      status: patient.status ?? "active",
      total_sessions: patient.total_sessions ?? 0,
    });
  }, [patient, reset]);

  if (!patient) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close patient details"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">
                {patient.name}
              </h3>
              <StatusBadge
                label={patient.status ?? "active"}
                tone={getPatientStatusTone(patient.status)}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {patient.phone}
              {patient.age ? ` · ${patient.age}y` : ""}
              {patient.gender ? ` · ${patient.gender}` : ""}
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
            id="patient-detail-form"
            onSubmit={handleSubmit((values) => onSubmit(patient.id, values))}
            className="space-y-4"
          >
            <label className="text-sm font-medium text-foreground">
              Diagnosis
              <input
                {...register("diagnosis")}
                type="text"
                placeholder="e.g. Low back pain"
                disabled={!canEdit}
                className={fieldClassName(Boolean(errors.diagnosis))}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">
                Status
                <select
                  {...register("status")}
                  disabled={!canEdit}
                  className={fieldClassName(Boolean(errors.status))}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </label>

              <label className="text-sm font-medium text-foreground">
                Total Sessions
                <input
                  {...register("total_sessions")}
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  className={fieldClassName(Boolean(errors.total_sessions))}
                />
                {errors.total_sessions?.message ? (
                  <span className="mt-1 block text-xs text-danger">
                    {errors.total_sessions.message}
                  </span>
                ) : null}
              </label>
            </div>

            <label className="text-sm font-medium text-foreground">
              Assigned Therapist
              <select
                {...register("assigned_therapist")}
                disabled={!canEdit}
                className={fieldClassName(false)}
              >
                <option value="">Unassigned</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </form>

          {/* Quick info */}
          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Session Progress
              </p>
              <div className="mt-2">
                <SessionProgress
                  completed={patient.completed_sessions}
                  total={patient.total_sessions}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Added
              </p>
              <p className="mt-1 text-sm text-foreground">
                {patient.created_at ? formatRelativeTime(patient.created_at) : "Unknown"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(`/patients/${patient.id}`)}
              className={cn(actionButtonClassName("secondary"), "flex-1")}
            >
              <ArrowUpRight className="h-4 w-4" />
              View Profile
            </button>
            {canBookAppointments ? (
              <button
                type="button"
                onClick={onBookAppointment}
                className={cn(actionButtonClassName("secondary"), "flex-1")}
              >
                <CalendarPlus className="h-4 w-4" />
                Book Appointment
              </button>
            ) : null}
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
                form="patient-detail-form"
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

// --- Table skeleton ---

function PatientsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-20 animate-pulse rounded bg-slate-200"
            />
          ))}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// --- Patient table row (desktop) ---

function PatientTableRow({
  onClick,
  patient,
  therapistLabel,
}: {
  onClick: () => void;
  patient: PatientRow;
  therapistLabel: string;
}) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-slate-50"
    >
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-foreground">{patient.name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-muted-foreground">{patient.phone}</span>
      </td>
      <td className="px-4 py-3">
        <span className="max-w-[180px] truncate text-sm text-muted-foreground">
          {patient.diagnosis ?? "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">{therapistLabel}</span>
      </td>
      <td className="px-4 py-3">
        <SessionProgress
          completed={patient.completed_sessions}
          total={patient.total_sessions}
        />
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          label={patient.status ?? "active"}
          tone={getPatientStatusTone(patient.status)}
        />
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {patient.created_at ? formatRelativeTime(patient.created_at) : "—"}
        </span>
      </td>
    </tr>
  );
}

// --- Patient card (mobile) ---

function PatientCard({
  onClick,
  patient,
  therapistLabel,
}: {
  onClick: () => void;
  patient: PatientRow;
  therapistLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{patient.name}</p>
        <StatusBadge
          label={patient.status ?? "active"}
          tone={getPatientStatusTone(patient.status)}
        />
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {patient.diagnosis ?? "No diagnosis"}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span className="font-mono">{patient.phone}</span>
        </div>
        <SessionProgress
          completed={patient.completed_sessions}
          total={patient.total_sessions}
        />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {therapistLabel}
      </div>
    </button>
  );
}

// --- Main page ---

export function Patients() {
  const { can } = useAuth();
  const {
    createPatient,
    patients,
    error: patientsError,
    isLoading: patientsLoading,
    updatePatient,
  } = usePatients();
  const {
    therapists,
    error: therapistsError,
    isLoading: therapistsLoading,
  } = useTherapists();
  const { createAppointment } = useAppointments();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const shouldOpenCreateModal = searchParams.get("new") === "1";

  function clearNewParam() {
    if (!shouldOpenCreateModal) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  }

  const filteredPatients = useMemo(() => {
    let list = patients;

    if (activeTab !== "all") {
      list = list.filter((p) => (p.status ?? "active") === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          (p.diagnosis?.toLowerCase().includes(q) ?? false),
      );
    }

    return list;
  }, [patients, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts = { all: patients.length, active: 0, completed: 0, dropped: 0 };
    for (const p of patients) {
      const s = p.status ?? "active";
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    return counts;
  }, [patients]);

  async function handleAddPatient(values: PatientCreateValues) {
    setIsCreatingPatient(true);

    const input: CreatePatientInput = {
      age: values.age ?? null,
      assigned_therapist: values.assigned_therapist || null,
      diagnosis: values.diagnosis || null,
      gender: values.gender || null,
      name: values.name,
      phone: values.phone,
      status: values.status,
      total_sessions: values.total_sessions,
    };

    const result = await createPatient(input);
    setIsCreatingPatient(false);

    if (result.error) {
      toast({
        title: "Could not add patient",
        description: result.error,
        variant: "error",
      });
      return;
    }

    setIsCreateModalOpen(false);

    if (result.patientId) {
      setSelectedPatientId(result.patientId);
    }

    toast({
      title: "Patient added",
      description: "The patient record is now available in your clinic list.",
      variant: "success",
    });
  }

  async function handleSavePatient(patientId: string, values: PatientEditValues) {
    setIsSaving(true);

    const input: PatientMutationInput = {
      assigned_therapist: values.assigned_therapist || null,
      diagnosis: values.diagnosis || null,
      status: values.status,
      total_sessions: values.total_sessions,
    };

    const result = await updatePatient(patientId, input);
    setIsSaving(false);

    if (result.error) {
      toast({
        title: "Could not save patient",
        description: result.error,
        variant: "error",
      });
      return;
    }

    toast({
      title: "Patient updated",
      description: "Changes saved successfully.",
      variant: "success",
    });
  }

  async function handleBookAppointment(values: AppointmentFormValues) {
    setIsSavingAppointment(true);

    const scheduledAt = new Date(`${values.date}T${values.time}:00`).toISOString();
    const result = await createAppointment({
      duration_mins: values.duration_mins,
      notes: values.notes || null,
      patient_id: values.patient_id,
      scheduled_at: scheduledAt,
      session_number: values.session_number ? Number(values.session_number) : null,
      therapist_id: values.therapist_id,
    });

    setIsSavingAppointment(false);

    if (result.error) {
      toast({
        title: "Could not book appointment",
        description: result.error,
        variant: "error",
      });
      return;
    }

    setIsBookModalOpen(false);
    toast({
      title: "Appointment booked",
      description: "The session has been scheduled.",
      variant: "success",
    });
  }

  const hasError = Boolean(patientsError || therapistsError);
  const isLoading = patientsLoading || therapistsLoading;
  const canManagePatients = can("manage_patients");
  const canManageAppointments = can("manage_appointments");
  const isCreateModalVisible = canManagePatients && (isCreateModalOpen || shouldOpenCreateModal);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Add, browse, and manage your clinic's existing patient records in one place."
        actions={canManagePatients ? (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className={actionButtonClassName("primary")}
          >
            <UserPlus className="h-4 w-4" />
            Add Patient
          </button>
        ) : undefined}
      />

      {hasError ? (
        <section className="rounded-lg border border-danger/20 bg-danger/5 p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground">
            Patient data could not load cleanly
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {patientsError ?? therapistsError}
          </p>
        </section>
      ) : null}

      {/* Tabs + Search */}
      {!isLoading ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 shadow-sm">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, phone, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-72"
            />
          </div>
        </div>
      ) : null}

      {/* Loading */}
      {isLoading ? <PatientsTableSkeleton /> : null}

      {/* Table (desktop) */}
      {!isLoading && filteredPatients.length > 0 ? (
        <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-card md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Diagnosis
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Therapist
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Added
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <PatientTableRow
                  key={patient.id}
                  patient={patient}
                  therapistLabel={therapistName(therapists, patient.assigned_therapist)}
                  onClick={() => setSelectedPatientId(patient.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Cards (mobile) */}
      {!isLoading && filteredPatients.length > 0 ? (
        <div className="grid gap-3 md:hidden">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              therapistLabel={therapistName(therapists, patient.assigned_therapist)}
              onClick={() => setSelectedPatientId(patient.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Empty: no patients at all */}
      {!isLoading && patients.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-card">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">No patients yet</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Start by adding your first existing patient record. You can fill in
              the diagnosis, therapist, and treatment plan details right here.
          </p>
          {canManagePatients ? (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className={cn(actionButtonClassName("primary"), "mt-5")}
            >
              Add your first patient
            </button>
          ) : null}
        </section>
      ) : null}

      {/* Empty: search/filter yields nothing */}
      {!isLoading && patients.length > 0 && filteredPatients.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-card">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Search className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">No patients match</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Try adjusting your search or switching the status filter.
          </p>
        </section>
      ) : null}

      <AddPatientModal
        open={isCreateModalVisible}
        onClose={() => { setIsCreateModalOpen(false); clearNewParam(); }}
        onSubmit={handleAddPatient}
        therapists={therapists}
        isSaving={isCreatingPatient}
      />

      {/* Detail drawer */}
      <PatientDetailDrawer
        patient={selectedPatient}
        therapists={therapists}
        canBookAppointments={canManageAppointments}
        canEdit={canManagePatients}
        isSaving={isSaving}
        onClose={() => setSelectedPatientId(null)}
        onSubmit={handleSavePatient}
        onBookAppointment={() => setIsBookModalOpen(true)}
      />

      {/* Book appointment modal */}
      <BookAppointmentModal
        open={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSubmit={handleBookAppointment}
        patients={patients}
        therapists={therapists}
        isSaving={isSavingAppointment}
        defaultPatientId={selectedPatient?.id}
        defaultTherapistId={selectedPatient?.assigned_therapist ?? undefined}
      />
    </div>
  );
}
