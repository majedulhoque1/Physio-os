import { useEffect, useState } from "react";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { Database, LeadRow, LeadSource, LeadStatus } from "@/types";

interface LeadMutationInput {
  assigned_to?: string | null;
  condition?: string | null;
  name: string;
  notes?: string | null;
  phone: string;
  source: LeadSource;
  status?: LeadStatus;
}

interface LeadMutationResult {
  error: string | null;
  patientId?: string | null;
}

interface UseLeadsState {
  error: string | null;
  isLoading: boolean;
  leads: LeadRow[];
}

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];

function normalizeOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function useLeads() {
  const [state, setState] = useState<UseLeadsState>({
    error: null,
    isLoading: true,
    leads: [],
  });

  async function loadLeads() {
    if (!supabase) {
      setState({
        error: supabaseConfigMessage,
        isLoading: false,
        leads: [],
      });
      return;
    }

    const { data, error } = await supabase
      .from("leads")
      .select("id, name, phone, source, condition, status, assigned_to, notes, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      setState({
        error: error.message,
        isLoading: false,
        leads: [],
      });
      return;
    }

    setState({
      error: null,
      isLoading: false,
      leads: (data ?? []) as LeadRow[],
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      if (!supabase) {
        if (isMounted) {
          setState({
            error: supabaseConfigMessage,
            isLoading: false,
            leads: [],
          });
        }

        return;
      }

      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, source, condition, status, assigned_to, notes, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setState({
          error: error.message,
          isLoading: false,
          leads: [],
        });
        return;
      }

      setState({
        error: null,
        isLoading: false,
        leads: (data ?? []) as LeadRow[],
      });
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  async function createLead(input: LeadMutationInput): Promise<LeadMutationResult> {
    if (!supabase) {
      return { error: supabaseConfigMessage };
    }

    const payload: LeadInsert = {
      assigned_to: input.assigned_to ?? null,
      condition: normalizeOptionalText(input.condition),
      name: input.name.trim(),
      notes: normalizeOptionalText(input.notes),
      phone: input.phone.trim(),
      source: input.source,
      status: input.status ?? "new",
    };

    const { error } = await supabase.from("leads").insert(payload as never);

    if (error) {
      return { error: error.message };
    }

    await loadLeads();
    return { error: null };
  }

  async function updateLead(
    leadId: string,
    input: LeadMutationInput,
  ): Promise<LeadMutationResult> {
    if (!supabase) {
      return { error: supabaseConfigMessage };
    }

    const payload: LeadUpdate = {
      assigned_to: input.assigned_to ?? null,
      condition: normalizeOptionalText(input.condition),
      name: input.name.trim(),
      notes: normalizeOptionalText(input.notes),
      phone: input.phone.trim(),
      source: input.source,
      status: input.status ?? "new",
    };

    const { error } = await supabase
      .from("leads")
      .update(payload as never)
      .eq("id", leadId);

    if (error) {
      return { error: error.message };
    }

    await loadLeads();
    return { error: null };
  }

  async function updateLeadStatus(
    leadId: string,
    status: LeadStatus,
  ): Promise<LeadMutationResult> {
    if (!supabase) {
      return { error: supabaseConfigMessage };
    }

    const payload: LeadUpdate = { status };

    const { error } = await supabase
      .from("leads")
      .update(payload as never)
      .eq("id", leadId);

    if (error) {
      return { error: error.message };
    }

    await loadLeads();
    return { error: null };
  }

  async function convertLeadToPatient(lead: LeadRow): Promise<LeadMutationResult> {
    if (!supabase) {
      return { error: supabaseConfigMessage };
    }

    const existingPatientResponse = await supabase
      .from("patients")
      .select("id")
      .eq("lead_id", lead.id)
      .limit(1)
      .maybeSingle();

    if (existingPatientResponse.error) {
      return { error: existingPatientResponse.error.message };
    }

    const existingPatient = existingPatientResponse.data as { id: string } | null;

    if (existingPatient?.id) {
      const payload: LeadUpdate = { status: "ongoing" };
      const updateResponse = await supabase
        .from("leads")
        .update(payload as never)
        .eq("id", lead.id);

      if (updateResponse.error) {
        return { error: updateResponse.error.message };
      }

      await loadLeads();
      return {
        error: null,
        patientId: existingPatient.id,
      };
    }

    const patientPayload: PatientInsert = {
      age: null,
      assigned_therapist: lead.assigned_to,
      completed_sessions: 0,
      diagnosis: normalizeOptionalText(lead.condition),
      gender: null,
      lead_id: lead.id,
      name: lead.name,
      phone: lead.phone,
      status: "active",
      total_sessions: 0,
    };

    const insertPatientResponse = await supabase
      .from("patients")
      .insert(patientPayload as never)
      .select("id")
      .single();

    if (insertPatientResponse.error) {
      return { error: insertPatientResponse.error.message };
    }

    const updatePayload: LeadUpdate = { status: "ongoing" };
    const updateLeadResponse = await supabase
      .from("leads")
      .update(updatePayload as never)
      .eq("id", lead.id);

    if (updateLeadResponse.error) {
      return { error: updateLeadResponse.error.message };
    }

    await loadLeads();
    const insertedPatient = insertPatientResponse.data as { id: string };

    return {
      error: null,
      patientId: insertedPatient.id,
    };
  }

  return {
    ...state,
    createLead,
    convertLeadToPatient,
    refreshLeads: loadLeads,
    updateLead,
    updateLeadStatus,
  };
}
