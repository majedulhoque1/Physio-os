import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { Database, SessionNoteRow } from "@/types";

export interface CreateSessionNoteInput {
  appointment_id: string;
  clinic_id: string;
  exercises_done?: string[] | null;
  mobility_score?: number | null;
  next_plan?: string | null;
  pain_scale?: number | null;
  patient_id: string;
  progress_notes?: string | null;
  therapist_id: string;
}

interface MutationResult {
  error: string | null;
}

interface UseSessionNotesState {
  error: string | null;
  isLoading: boolean;
  notes: SessionNoteRow[];
}

type SessionNoteInsert = Database["public"]["Tables"]["session_notes"]["Insert"];

const SELECT_FIELDS =
  "id, appointment_id, patient_id, therapist_id, clinic_id, pain_scale, mobility_score, exercises_done, progress_notes, next_plan, created_at";

export function useSessionNotes({
  patientId,
  appointmentId,
}: {
  appointmentId?: string;
  patientId?: string;
} = {}) {
  const { can, clinicId, linkedTherapistId, role } = useAuth();
  const [state, setState] = useState<UseSessionNotesState>({
    error: null,
    isLoading: true,
    notes: [],
  });

  const loadNotes = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, notes: [] });
      return;
    }

    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, notes: [] });
      return;
    }

    let query = supabase
      .from("session_notes")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
      .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);
    if (appointmentId) query = query.eq("appointment_id", appointmentId);

    const { data, error } = await query;

    if (error) {
      setState({ error: error.message, isLoading: false, notes: [] });
      return;
    }

    // SECURITY: Filter by role on client (therapist sees only own notes)
    const typed = (data ?? []) as SessionNoteRow[];
    const filtered = role === "therapist" && linkedTherapistId
      ? typed.filter(n => n.therapist_id === linkedTherapistId)
      : typed;

    setState({ error: null, isLoading: false, notes: filtered });
  }, [appointmentId, clinicId, linkedTherapistId, patientId, role]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive) setState({ error: supabaseConfigMessage, isLoading: false, notes: [] });
        return;
      }

      if (!clinicId) {
        if (isActive) setState({ error: "No clinic context", isLoading: false, notes: [] });
        return;
      }

      let query = supabase
        .from("session_notes")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
        .order("created_at", { ascending: false });

      if (patientId) query = query.eq("patient_id", patientId);
      if (appointmentId) query = query.eq("appointment_id", appointmentId);

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, notes: [] });
        return;
      }

      // SECURITY: Filter by role on client (therapist sees only own notes)
      const typed = (data ?? []) as SessionNoteRow[];
      const filtered = role === "therapist" && linkedTherapistId
        ? typed.filter(n => n.therapist_id === linkedTherapistId)
        : typed;

      setState({ error: null, isLoading: false, notes: filtered });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [appointmentId, clinicId, linkedTherapistId, patientId, role]);

  const createNote = useCallback(
    async (input: CreateSessionNoteInput): Promise<MutationResult> => {
      if (!can("record_session_notes")) {
        return { error: "You do not have permission to record session notes." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      // SECURITY: Therapists can only record notes for their own sessions
      if (role === "therapist" && linkedTherapistId && input.therapist_id !== linkedTherapistId) {
        return { error: "Therapists can only record notes for their own sessions." };
      }

      const payload: SessionNoteInsert = {
        appointment_id: input.appointment_id,
        clinic_id: clinicId, // SECURITY: Use clinic from auth context
        exercises_done: input.exercises_done ?? null,
        mobility_score: input.mobility_score ?? null,
        next_plan: input.next_plan ?? null,
        pain_scale: input.pain_scale ?? null,
        patient_id: input.patient_id,
        progress_notes: input.progress_notes ?? null,
        therapist_id: input.therapist_id,
      };

      const { error } = await supabase.from("session_notes").insert(payload as never);
      if (error) return { error: error.message };

      await loadNotes();
      return { error: null };
    },
    [can, clinicId, linkedTherapistId, loadNotes, role],
  );

  return { ...state, createNote, refreshNotes: loadNotes };
}
