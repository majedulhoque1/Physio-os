import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPlus, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { TherapistRow } from "@/types";

const treatmentPlanSchema = z.object({
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  therapist_id: z.string().min(1, "Therapist is required"),
  total_sessions: z.coerce.number().int().min(1, "At least 1 session required").max(200),
});

type TreatmentPlanFormInput = z.input<typeof treatmentPlanSchema>;
export type TreatmentPlanFormValues = z.output<typeof treatmentPlanSchema>;

interface AddTreatmentPlanModalProps {
  defaultTherapistId?: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: TreatmentPlanFormValues) => Promise<void>;
  open: boolean;
  patientName: string;
  therapists: TherapistRow[];
}

function fieldClassName(hasError: boolean) {
  return cn(
    "mt-2 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
    hasError
      ? "border-danger/40 ring-2 ring-danger/10"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
  );
}

export function AddTreatmentPlanModal({
  defaultTherapistId,
  isSaving,
  onClose,
  onSubmit,
  open,
  patientName,
  therapists,
}: AddTreatmentPlanModalProps) {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<TreatmentPlanFormInput, undefined, TreatmentPlanFormValues>({
    resolver: zodResolver(treatmentPlanSchema),
    defaultValues: {
      diagnosis: "",
      notes: "",
      therapist_id: defaultTherapistId ?? "",
      total_sessions: 10,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        diagnosis: "",
        notes: "",
        therapist_id: defaultTherapistId ?? "",
        total_sessions: 10,
      });
    }
  }, [open, defaultTherapistId, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">New Treatment Plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Creating plan for {patientName}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Diagnosis
              <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              <input
                {...register("diagnosis")}
                type="text"
                placeholder="e.g. Lumbar disc herniation"
                className={fieldClassName(false)}
              />
            </label>

            <label className="text-sm font-medium text-foreground">
              Total Sessions
              <input
                {...register("total_sessions")}
                type="number"
                min={1}
                max={200}
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
            Notes
            <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Treatment goals, precautions..."
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
              <ClipboardPlus className="h-4 w-4" />
              {isSaving ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
