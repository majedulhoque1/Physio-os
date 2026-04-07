import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { TherapistRow } from "@/types";

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

const patientCreateSchema = z.object({
  age: z.coerce.number().int().min(0, "Must be 0 or more").max(120, "Keep it under 120").nullable(),
  assigned_therapist: z.string().optional(),
  diagnosis: z.string().optional(),
  gender: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  status: z.enum(["active", "completed", "dropped"]),
});

type PatientCreateFormInput = z.input<typeof patientCreateSchema>;
export type PatientCreateValues = z.output<typeof patientCreateSchema>;

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

export function AddPatientModal({
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

                {/* Therapist */}
                <label className="text-sm font-medium text-foreground">
                  Assigned Therapist
                  <select {...register("assigned_therapist")} className={fieldClassName(false)}>
                    <option value="">Unassigned</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>

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
