import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { PrescriptionInsert, PrescriptionRow, PrescriptionUpdate } from "@/types";

export interface CreatePrescriptionInput {
  appointment_id: string;
  patient_id: string;
  therapist_id: string;
  treatment_plan_id?: string | null;
  chief_complaints?: string[];
  body_parts?: string[];
  pain_vas?: number | null;
  diagnosis?: string | null;
  modalities?: string[];
  exercises?: string[];
  advice_en?: string[];
  advice_bn?: string[];
  notes?: string | null;
  template_used_id?: string | null;
  cloned_from_id?: string | null;
}

interface MutationResult {
  error: string | null;
  prescriptionId?: string | null;
}

interface UsePrescriptionsState {
  error: string | null;
  isLoading: boolean;
  prescriptions: PrescriptionRow[];
}

const SELECT_FIELDS =
  "id, clinic_id, appointment_id, patient_id, therapist_id, treatment_plan_id, chief_complaints, body_parts, pain_vas, diagnosis, modalities, exercises, advice_en, advice_bn, notes, template_used_id, cloned_from_id, handwriting_svg, handwriting_url, created_at, updated_at";

export function usePrescriptions(
  { patientId, appointmentId }: { patientId?: string; appointmentId?: string } = {},
) {
  const { can, clinicId, linkedTherapistId, role } = useAuth();
  const [state, setState] = useState<UsePrescriptionsState>({
    error: null,
    isLoading: true,
    prescriptions: [],
  });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, prescriptions: [] });
      return;
    }
    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, prescriptions: [] });
      return;
    }

    let query = supabase
      .from("prescriptions")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);
    if (appointmentId) query = query.eq("appointment_id", appointmentId);

    const { data, error } = await query;
    if (error) {
      setState({ error: error.message, isLoading: false, prescriptions: [] });
      return;
    }

    const typed = (data ?? []) as PrescriptionRow[];
    const filtered =
      role === "therapist" && linkedTherapistId
        ? typed.filter((p) => p.therapist_id === linkedTherapistId)
        : typed;

    setState({ error: null, isLoading: false, prescriptions: filtered });
  }, [appointmentId, clinicId, linkedTherapistId, patientId, role]);

  useEffect(() => {
    let isActive = true;
    (async () => {
      await load();
      if (!isActive) return;
    })();
    return () => {
      isActive = false;
    };
  }, [load]);

  const create = useCallback(
    async (input: CreatePrescriptionInput): Promise<MutationResult> => {
      if (!can("manage_prescriptions") && !can("record_session_notes")) {
        return { error: "You do not have permission to create prescriptions.", prescriptionId: null };
      }
      if (!supabase) return { error: supabaseConfigMessage, prescriptionId: null };
      if (!clinicId) return { error: "No clinic context", prescriptionId: null };

      const payload: PrescriptionInsert = {
        appointment_id: input.appointment_id,
        patient_id: input.patient_id,
        therapist_id: input.therapist_id,
        clinic_id: clinicId,
        treatment_plan_id: input.treatment_plan_id ?? null,
        chief_complaints: input.chief_complaints ?? [],
        body_parts: input.body_parts ?? [],
        pain_vas: input.pain_vas ?? null,
        diagnosis: input.diagnosis ?? null,
        modalities: input.modalities ?? [],
        exercises: input.exercises ?? [],
        advice_en: input.advice_en ?? [],
        advice_bn: input.advice_bn ?? [],
        notes: input.notes ?? null,
        template_used_id: input.template_used_id ?? null,
        cloned_from_id: input.cloned_from_id ?? null,
      };

      const { data, error } = await supabase
        .from("prescriptions")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, prescriptionId: null };
      await load();
      return { error: null, prescriptionId: (data as any)?.id ?? null };
    },
    [can, clinicId, load],
  );

  const update = useCallback(
    async (id: string, patch: PrescriptionUpdate): Promise<MutationResult> => {
      if (!can("manage_prescriptions") && !can("record_session_notes")) {
        return { error: "You do not have permission to update prescriptions." };
      }
      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const { error } = await supabase
        .from("prescriptions")
        .update(patch as never)
        .eq("id", id)
        .eq("clinic_id", clinicId);

      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [can, clinicId, load],
  );

  const getLastForPatient = useCallback(
    async (patientIdArg: string): Promise<PrescriptionRow | null> => {
      if (!supabase || !clinicId) return null;
      const { data } = await supabase
        .from("prescriptions")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .eq("patient_id", patientIdArg)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as PrescriptionRow | null) ?? null;
    },
    [clinicId],
  );

  const getByAppointment = useCallback(
    async (appointmentIdArg: string): Promise<PrescriptionRow | null> => {
      if (!supabase || !clinicId) return null;
      const { data } = await supabase
        .from("prescriptions")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .eq("appointment_id", appointmentIdArg)
        .maybeSingle();
      return (data as PrescriptionRow | null) ?? null;
    },
    [clinicId],
  );

  return {
    ...state,
    create,
    update,
    getLastForPatient,
    getByAppointment,
    refresh: load,
  };
}
