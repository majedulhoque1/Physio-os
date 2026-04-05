import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMockClinic } from "@/contexts/MockClinicContext";
import { getVisibleSessionNotes } from "@/lib/mockClinic";
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
  const { can, isDemoMode, linkedTherapistId, role } = useAuth();
  const { createSessionNote: createMockSessionNote, data: mockData } = useMockClinic();
  const [state, setState] = useState<UseSessionNotesState>({
    error: null,
    isLoading: true,
    notes: [],
  });

  const demoNotes = useMemo(
    () =>
      getVisibleSessionNotes(mockData, role, linkedTherapistId)
        .filter((note) => (patientId ? note.patient_id === patientId : true))
        .filter((note) => (appointmentId ? note.appointment_id === appointmentId : true))
        .sort((left, right) => (right.created_at ?? "").localeCompare(left.created_at ?? "")),
    [mockData, role, linkedTherapistId, patientId, appointmentId],
  );

  async function loadNotes() {
    if (isDemoMode) {
      setState({ error: null, isLoading: false, notes: demoNotes });
      return;
    }

    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, notes: [] });
      return;
    }

    let query = supabase.from("session_notes").select(SELECT_FIELDS).order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);
    if (appointmentId) query = query.eq("appointment_id", appointmentId);

    const { data, error } = await query;

    if (error) {
      setState({ error: error.message, isLoading: false, notes: [] });
      return;
    }

    setState({ error: null, isLoading: false, notes: (data ?? []) as SessionNoteRow[] });
  }

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (isDemoMode) {
        if (isActive) {
          setState({ error: null, isLoading: false, notes: demoNotes });
        }
        return;
      }

      if (!supabase) {
        if (isActive) setState({ error: supabaseConfigMessage, isLoading: false, notes: [] });
        return;
      }

      let query = supabase.from("session_notes").select(SELECT_FIELDS).order("created_at", { ascending: false });

      if (patientId) query = query.eq("patient_id", patientId);
      if (appointmentId) query = query.eq("appointment_id", appointmentId);

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, notes: [] });
        return;
      }

      setState({ error: null, isLoading: false, notes: (data ?? []) as SessionNoteRow[] });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [appointmentId, demoNotes, isDemoMode, patientId]);

  async function createNote(input: CreateSessionNoteInput): Promise<MutationResult> {
    if (!can("record_session_notes")) {
      return { error: "You do not have permission to record session notes." };
    }

    if (isDemoMode) {
      if (role === "therapist" && input.therapist_id !== linkedTherapistId) {
        return { error: "Therapists can only record notes for their own sessions." };
      }

      createMockSessionNote({
        appointment_id: input.appointment_id,
        clinic_id: input.clinic_id,
        exercises_done: input.exercises_done ?? null,
        mobility_score: input.mobility_score ?? null,
        next_plan: input.next_plan ?? null,
        pain_scale: input.pain_scale ?? null,
        patient_id: input.patient_id,
        progress_notes: input.progress_notes ?? null,
        therapist_id: input.therapist_id,
      });

      return { error: null };
    }

    if (!supabase) return { error: supabaseConfigMessage };

    const payload: SessionNoteInsert = {
      appointment_id: input.appointment_id,
      clinic_id: input.clinic_id,
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
  }

  return { ...state, createNote, refreshNotes: loadNotes };
}
