import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, X } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { PatientRow, TherapistRow } from "@/types";

const appointmentFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  duration_mins: z.coerce.number().int().min(15, "Minimum 15 min"),
  notes: z.string().optional(),
  patient_id: z.string().min(1, "Patient is required"),
  session_number: z.string().optional(),
  therapist_id: z.string().min(1, "Therapist is required"),
  time: z.string().min(1, "Select a time slot"),
});

type AppointmentFormInput = z.input<typeof appointmentFormSchema>;
export type AppointmentFormValues = z.output<typeof appointmentFormSchema>;

interface BookAppointmentModalProps {
  defaultPatientId?: string;
  defaultTherapistId?: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
  open: boolean;
  patients: PatientRow[];
  therapists: TherapistRow[];
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// 8:00 AM → 6:00 PM in 30-min slots
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 18) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function formatSlot(slot: string) {
  const [hStr, mStr] = slot.split(":");
  const h = Number(hStr);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

function fieldClassName(hasError: boolean) {
  return cn(
    "mt-2 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
    hasError
      ? "border-danger/40 ring-2 ring-danger/10"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
  );
}

export function BookAppointmentModal({
  defaultPatientId,
  defaultTherapistId,
  isSaving,
  onClose,
  onSubmit,
  open,
  patients,
  therapists,
}: BookAppointmentModalProps) {
  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormInput, undefined, AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: todayString(),
      duration_mins: 45,
      notes: "",
      patient_id: defaultPatientId ?? "",
      session_number: "",
      therapist_id: defaultTherapistId ?? "",
      time: "",
    },
  });

  const selectedTime = useWatch({ control, name: "time" });

  useEffect(() => {
    if (open) {
      reset({
        date: todayString(),
        duration_mins: 45,
        notes: "",
        patient_id: defaultPatientId ?? "",
        session_number: "",
        therapist_id: defaultTherapistId ?? "",
        time: "",
      });
    }
  }, [open, defaultPatientId, defaultTherapistId, reset]);

  if (!open) return null;

  const lockedPatient = defaultPatientId
    ? patients.find((p) => p.id === defaultPatientId)
    : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Book Appointment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {lockedPatient
                ? `Scheduling for ${lockedPatient.name}`
                : "Schedule a session for a patient."}
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5 py-5">
          {/* Row 1: Patient + Therapist */}
          <div className="grid gap-4 sm:grid-cols-2">
            {lockedPatient ? (
              <label className="text-sm font-medium text-foreground">
                Patient
                <input
                  type="text"
                  value={lockedPatient.name}
                  disabled
                  className={cn(fieldClassName(false), "cursor-not-allowed opacity-60")}
                />
                <input type="hidden" {...register("patient_id")} />
              </label>
            ) : (
              <label className="text-sm font-medium text-foreground">
                Patient
                <select
                  {...register("patient_id")}
                  className={fieldClassName(Boolean(errors.patient_id))}
                >
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.patient_id?.message ? (
                  <span className="mt-1 block text-xs text-danger">
                    {errors.patient_id.message}
                  </span>
                ) : null}
              </label>
            )}

            <label className="text-sm font-medium text-foreground">
              Therapist
              <select
                {...register("therapist_id")}
                className={fieldClassName(Boolean(errors.therapist_id))}
              >
                <option value="">Select therapist</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.specialization ? ` — ${t.specialization}` : ""}
                  </option>
                ))}
              </select>
              {errors.therapist_id?.message ? (
                <span className="mt-1 block text-xs text-danger">
                  {errors.therapist_id.message}
                </span>
              ) : null}
            </label>
          </div>

          {/* Row 2: Date + Duration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Date
              <input
                {...register("date")}
                type="date"
                className={fieldClassName(Boolean(errors.date))}
              />
              {errors.date?.message ? (
                <span className="mt-1 block text-xs text-danger">{errors.date.message}</span>
              ) : null}
            </label>

            <label className="text-sm font-medium text-foreground">
              Duration
              <select
                {...register("duration_mins", { valueAsNumber: true })}
                className={fieldClassName(Boolean(errors.duration_mins))}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </label>
          </div>

          {/* Time slot grid */}
          <div>
            <p className="text-sm font-medium text-foreground">
              Time
              {errors.time?.message ? (
                <span className="ml-2 text-xs font-normal text-danger">
                  {errors.time.message}
                </span>
              ) : null}
            </p>
            <input type="hidden" {...register("time")} />
            <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-7">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setValue("time", slot, { shouldValidate: true })}
                  className={cn(
                    "rounded-md px-1.5 py-2 text-xs font-medium transition-colors",
                    selectedTime === slot
                      ? "bg-primary text-white shadow-sm"
                      : "border border-border text-foreground hover:border-primary hover:bg-primary/5",
                  )}
                >
                  {formatSlot(slot)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <label className="text-sm font-medium text-foreground">
            Notes
            <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
            <input
              {...register("notes")}
              type="text"
              placeholder="Pre-assessment, follow-up..."
              className={fieldClassName(false)}
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CalendarPlus className="h-4 w-4" />
              {isSaving ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
