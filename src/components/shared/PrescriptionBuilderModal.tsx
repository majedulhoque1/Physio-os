import { Printer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdvicePicker } from "@/components/prescription/AdvicePicker";
import { BodyPartPicker } from "@/components/prescription/BodyPartPicker";
import { ChipMultiSelect } from "@/components/prescription/ChipMultiSelect";
import { ClonePreviousButton } from "@/components/prescription/ClonePreviousButton";
import { TemplateApplyMenu } from "@/components/prescription/TemplateApplyMenu";
import { VASSlider } from "@/components/prescription/VASSlider";
import { useBanglaAdvice } from "@/hooks/useBanglaAdvice";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useProtocolTemplates } from "@/hooks/useProtocolTemplates";
import {
  CHIEF_COMPLAINTS,
  DEFAULT_EXERCISES,
  MODALITIES,
  type PrescriptionRow,
  type ProtocolTemplateRow,
} from "@/types";

export interface PrescriptionBuilderPatientContext {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  patientPhone: string | null;
  therapistId: string;
  therapistName: string;
  sessionNumber: number | null;
  appointmentAt: string;
  treatmentPlanId?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: PrescriptionBuilderPatientContext;
  /** When provided, modal opens in edit mode. */
  existing?: PrescriptionRow | null;
  onSaved?: (id: string, shouldPrint: boolean) => void;
}

export function PrescriptionBuilderModal({ open, onClose, context, existing, onSaved }: Props) {
  const { templates } = useProtocolTemplates();
  const { byCategory } = useBanglaAdvice();
  const { create, update, getLastForPatient } = usePrescriptions();

  const [chiefComplaints, setChiefComplaints] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [painVas, setPainVas] = useState<number | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [modalities, setModalities] = useState<string[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [adviceBn, setAdviceBn] = useState<string[]>([]);
  const [adviceEn, setAdviceEn] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [templateUsedId, setTemplateUsedId] = useState<string | null>(null);
  const [clonedFromId, setClonedFromId] = useState<string | null>(null);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate from existing Rx (edit mode) or reset + check for previous visit (create mode)
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setChiefComplaints(existing.chief_complaints ?? []);
      setBodyParts(existing.body_parts ?? []);
      setPainVas(existing.pain_vas ?? null);
      setDiagnosis(existing.diagnosis ?? "");
      setModalities(existing.modalities ?? []);
      setExercises(existing.exercises ?? []);
      setAdviceBn(existing.advice_bn ?? []);
      setAdviceEn(existing.advice_en ?? []);
      setNotes(existing.notes ?? "");
      setTemplateUsedId(existing.template_used_id ?? null);
      setClonedFromId(existing.cloned_from_id ?? null);
      return;
    }
    // Create mode: reset + check for previous Rx
    setChiefComplaints([]);
    setBodyParts([]);
    setPainVas(null);
    setDiagnosis("");
    setModalities([]);
    setExercises([]);
    setAdviceBn([]);
    setAdviceEn([]);
    setNotes("");
    setTemplateUsedId(null);
    setClonedFromId(null);

    (async () => {
      const prev = await getLastForPatient(context.patientId);
      setHasPrevious(Boolean(prev));
    })();
  }, [context.patientId, existing, getLastForPatient, open]);

  const applyTemplate = (tpl: ProtocolTemplateRow) => {
    // Per spec: does NOT overwrite chief_complaints or pain_vas
    if (!diagnosis) setDiagnosis(tpl.diagnosis ?? "");
    setModalities(mergeUnique(modalities, tpl.default_modalities));
    setExercises(mergeUnique(exercises, tpl.default_exercises));
    setAdviceEn(mergeUnique(adviceEn, tpl.default_advice_en));
    setAdviceBn(mergeUnique(adviceBn, tpl.default_advice_bn));
    setBodyParts(mergeUnique(bodyParts, tpl.default_body_parts));
    setTemplateUsedId(tpl.id);
  };

  const clonePrevious = async () => {
    const prev = await getLastForPatient(context.patientId);
    if (!prev) return;
    // Per spec: copy everything EXCEPT pain_vas and notes
    setChiefComplaints(prev.chief_complaints ?? []);
    setBodyParts(prev.body_parts ?? []);
    setDiagnosis(prev.diagnosis ?? "");
    setModalities(prev.modalities ?? []);
    setExercises(prev.exercises ?? []);
    setAdviceBn(prev.advice_bn ?? []);
    setAdviceEn(prev.advice_en ?? []);
    setClonedFromId(prev.id);
    setPainVas(null);
    setNotes("");
  };

  const handleSave = async (andPrint: boolean) => {
    setSaving(true);
    setSaveError(null);

    const payload = {
      chief_complaints: chiefComplaints,
      body_parts: bodyParts,
      pain_vas: painVas,
      diagnosis: diagnosis || null,
      modalities,
      exercises,
      advice_bn: adviceBn,
      advice_en: adviceEn,
      notes: notes || null,
      template_used_id: templateUsedId,
      cloned_from_id: clonedFromId,
    };

    let result: { error: string | null; prescriptionId?: string | null };
    if (existing) {
      const r = await update(existing.id, payload);
      result = { error: r.error, prescriptionId: existing.id };
    } else {
      result = await create({
        appointment_id: context.appointmentId,
        patient_id: context.patientId,
        therapist_id: context.therapistId,
        treatment_plan_id: context.treatmentPlanId ?? null,
        ...payload,
      });
    }

    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    onSaved?.(result.prescriptionId!, andPrint);
    if (andPrint && result.prescriptionId) {
      window.open(`/prescriptions/${result.prescriptionId}/print`, "_blank");
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-4xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-semibold">
              {existing ? "Edit Prescription" : "New Prescription"}
            </h2>
            <div className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{context.patientName}</span>
              {context.patientAge && <span> • {context.patientAge}y</span>}
              {context.patientGender && <span> • {context.patientGender}</span>}
              {context.patientPhone && <span> • {context.patientPhone}</span>}
              {context.sessionNumber && <span> • Session #{context.sessionNumber}</span>}
            </div>
            <div className="text-xs text-gray-500">
              Therapist: {context.therapistName} •{" "}
              {new Date(context.appointmentAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50 p-3">
          <TemplateApplyMenu templates={templates} onApply={applyTemplate} />
          <ClonePreviousButton onClone={clonePrevious} hasPrevious={hasPrevious} />
        </div>

        {/* Body */}
        <div className="space-y-5 p-4">
          <ChipMultiSelect
            label="Chief complaints"
            options={CHIEF_COMPLAINTS}
            value={chiefComplaints}
            onChange={setChiefComplaints}
          />
          <BodyPartPicker value={bodyParts} onChange={setBodyParts} />
          <VASSlider value={painVas} onChange={setPainVas} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Diagnosis</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Adhesive Capsulitis"
            />
          </div>

          <ChipMultiSelect
            label="Modalities"
            options={MODALITIES}
            value={modalities}
            onChange={setModalities}
          />
          <ChipMultiSelect
            label="Exercises"
            options={DEFAULT_EXERCISES}
            value={exercises}
            onChange={setExercises}
            allowCustom
            placeholder="Add custom exercise…"
          />
          <AdvicePicker
            byCategory={byCategory}
            selectedBn={adviceBn}
            selectedEn={adviceEn}
            onChange={({ bn, en }) => {
              setAdviceBn(bn);
              setAdviceEn(en);
            }}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Additional notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional free-text notes"
            />
          </div>

          {saveError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Printer size={16} />
            Save &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeUnique(existing: string[], incoming: string[] | null | undefined): string[] {
  const out = [...existing];
  for (const item of incoming ?? []) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}
