import { ArrowLeft, CalendarPlus, ClipboardList, Phone, User } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookAppointmentModal, type AppointmentFormValues } from "@/components/shared/BookAppointmentModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionNoteModal } from "@/components/shared/SessionNoteModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useSessionNotes, type CreateSessionNoteInput } from "@/hooks/useSessionNotes";
import { useTherapists } from "@/hooks/useTherapists";
import { formatDate, formatTime } from "@/lib/utils";
import type {
  AppointmentStatus,
  AppointmentWithRelations,
  PatientStatus,
  SessionNoteRow,
  StatusTone,
} from "@/types";

function getPatientStatusTone(status: PatientStatus | null): StatusTone {
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

function getAppointmentStatusTone(status: AppointmentStatus | null): StatusTone {
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

function SessionProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Sessions</span>
        <span className="font-semibold text-foreground">
          {completed} / {total}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NotePreview({ note }: { note: SessionNoteRow }) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs space-y-1">
      {note.pain_scale || note.mobility_score ? (
        <div className="flex gap-3 text-muted-foreground">
          {note.pain_scale ? <span>Pain: <strong className="text-foreground">{note.pain_scale}/10</strong></span> : null}
          {note.mobility_score ? <span>Mobility: <strong className="text-foreground">{note.mobility_score}/10</strong></span> : null}
        </div>
      ) : null}
      {note.progress_notes ? (
        <p className="text-muted-foreground line-clamp-2">{note.progress_notes}</p>
      ) : null}
      {note.next_plan ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Next: </span>
          {note.next_plan}
        </p>
      ) : null}
    </div>
  );
}

function AppointmentHistoryRow({
  appointment,
  canRecordNote,
  note,
  clinicId,
  onRecordNote,
}: {
  appointment: AppointmentWithRelations;
  canRecordNote: boolean;
  clinicId: string | null;
  note?: SessionNoteRow;
  onRecordNote: (apt: AppointmentWithRelations) => void;
}) {
  const status = appointment.status ?? "scheduled";
  const therapistName = appointment.therapists?.name ?? "Unassigned";

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center">
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {formatTime(appointment.scheduled_at)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(appointment.scheduled_at)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">{therapistName}</p>
          {appointment.session_number ? (
            <p className="text-xs text-muted-foreground">Session #{appointment.session_number}</p>
          ) : null}
          {appointment.notes ? (
            <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
              {appointment.notes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {appointment.duration_mins ?? 45} min
          </span>
          <StatusBadge label={status} tone={getAppointmentStatusTone(status)} />
          {status === "completed" && !note && clinicId && canRecordNote ? (
            <button
              type="button"
              onClick={() => onRecordNote(appointment)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Add note
            </button>
          ) : null}
        </div>
      </div>

      {note ? <NotePreview note={note} /> : null}
    </div>
  );
}

export function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can, clinicId, linkedTherapistId, role } = useAuth();

  const { appointments, isLoading: aptsLoading, createAppointment } = useAppointments(
    id ? { patientId: id } : {},
  );
  const {
    patients,
    error: patientError,
    isLoading: patientLoading,
  } = usePatients();
  const { therapists } = useTherapists();
  const { notes, createNote } = useSessionNotes({ patientId: id });

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [noteTarget, setNoteTarget] = useState<AppointmentWithRelations | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const notesByAppointmentId = new Map(notes.map((n) => [n.appointment_id, n]));
  const patient = patients.find((item) => item.id === id) ?? null;

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

    setIsBookingOpen(false);
    toast({
      title: "Appointment booked",
      description: "The session has been scheduled.",
      variant: "success",
    });
  }

  async function handleSaveNote(input: CreateSessionNoteInput) {
    setIsSavingNote(true);
    const result = await createNote(input);
    setIsSavingNote(false);

    if (result.error) {
      toast({ title: "Could not save note", description: result.error, variant: "error" });
      return;
    }

    setNoteTarget(null);
    toast({ title: "Session note saved", variant: "success" });
  }

  const assignedTherapist = patient?.assigned_therapist
    ? therapists.find((t) => t.id === patient.assigned_therapist)
    : null;

  if (patientLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (patientError || !patient) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </button>
        <section className="rounded-lg border border-danger/20 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-foreground">Patient not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {patientError ?? "This record may have been deleted."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/patients")}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </button>

      <PageHeader
        title={patient.name}
        description={patient.diagnosis ?? "No diagnosis recorded"}
        actions={can("manage_appointments") ? (
          <button
            type="button"
            onClick={() => setIsBookingOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule Appointment
          </button>
        ) : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contact
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{patient.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-foreground">
                {[patient.age ? `${patient.age}y` : null, patient.gender]
                  .filter(Boolean)
                  .join(", ") || "Age/gender not recorded"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Status
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge
                label={patient.status ?? "active"}
                tone={getPatientStatusTone(patient.status)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Therapist:{" "}
              <span className="font-medium text-foreground">
                {assignedTherapist?.name ?? "Unassigned"}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-card sm:col-span-2 lg:col-span-1">
          <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Progress
          </p>
          <SessionProgress
            completed={patient.completed_sessions ?? 0}
            total={patient.total_sessions ?? 0}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Appointments
        </h3>

        {aptsLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center">
            <p className="text-sm font-semibold text-foreground">No appointments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the button above to schedule the first session.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => (
              <AppointmentHistoryRow
                key={apt.id}
                appointment={apt}
                canRecordNote={
                  can("record_session_notes") &&
                  (role !== "therapist" || apt.therapist_id === linkedTherapistId)
                }
                note={notesByAppointmentId.get(apt.id)}
                clinicId={clinicId}
                onRecordNote={setNoteTarget}
              />
            ))}
          </div>
        )}
      </section>

      <BookAppointmentModal
        open={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSubmit={handleBookAppointment}
        patients={patients}
        therapists={therapists}
        defaultPatientId={patient.id}
        defaultTherapistId={patient.assigned_therapist ?? undefined}
        isSaving={isSaving}
      />

      {noteTarget ? (
        <SessionNoteModal
          open={true}
          onClose={() => setNoteTarget(null)}
          onSubmit={handleSaveNote}
          isSaving={isSavingNote}
          appointmentId={noteTarget.id}
          patientId={patient.id}
          patientName={patient.name}
          therapistId={noteTarget.therapist_id}
          clinicId={clinicId ?? ""}
        />
      ) : null}
    </div>
  );
}
