import { X } from "lucide-react";
import { useState } from "react";
import type { CreateSessionNoteInput } from "@/hooks/useSessionNotes";

interface Props {
  appointmentId: string;
  clinicId: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSessionNoteInput) => void;
  open: boolean;
  patientId: string;
  patientName: string;
  therapistId: string;
}

const SCALE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function SessionNoteModal({
  appointmentId,
  clinicId,
  isSaving,
  onClose,
  onSubmit,
  open,
  patientId,
  patientName,
  therapistId,
}: Props) {
  const [formKey, setFormKey] = useState(0);
  const [lastAppointmentId, setLastAppointmentId] = useState(appointmentId);
  if (appointmentId !== lastAppointmentId) {
    setLastAppointmentId(appointmentId);
    setFormKey((k) => k + 1);
  }

  if (!open) return null;

  return <SessionNoteForm key={formKey} {...{ appointmentId, clinicId, isSaving, onClose, onSubmit, patientId, patientName, therapistId }} />;
}

function SessionNoteForm({
  appointmentId,
  clinicId,
  isSaving,
  onClose,
  onSubmit,
  patientId,
  patientName,
  therapistId,
}: Omit<Props, "open">) {
  const [painScale, setPainScale] = useState<number | null>(null);
  const [mobilityScore, setMobilityScore] = useState<number | null>(null);
  const [exercisesDone, setExercisesDone] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [nextPlan, setNextPlan] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const exercises = exercisesDone
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    onSubmit({
      appointment_id: appointmentId,
      clinic_id: clinicId,
      exercises_done: exercises.length > 0 ? exercises : null,
      mobility_score: mobilityScore,
      next_plan: nextPlan.trim() || null,
      pain_scale: painScale,
      patient_id: patientId,
      progress_notes: progressNotes.trim() || null,
      therapist_id: therapistId,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Record Session Note</h2>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Pain scale (1–10)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SCALE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPainScale(painScale === n ? null : n)}
                      className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                        painScale === n
                          ? "bg-primary text-white"
                          : "border border-border bg-background text-foreground hover:border-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Mobility score (1–10)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SCALE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMobilityScore(mobilityScore === n ? null : n)}
                      className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                        mobilityScore === n
                          ? "bg-success text-white"
                          : "border border-border bg-background text-foreground hover:border-success"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Exercises done
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                value={exercisesDone}
                onChange={(e) => setExercisesDone(e.target.value)}
                placeholder="e.g. Hip flexor stretch, Quad sets, SLR"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Progress notes
              </label>
              <textarea
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                rows={3}
                placeholder="Patient showed improvement in range of motion…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Next session plan
              </label>
              <textarea
                value={nextPlan}
                onChange={(e) => setNextPlan(e.target.value)}
                rows={2}
                placeholder="Progress to weight-bearing exercises, add resistance band…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
