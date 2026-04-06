import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { MessageLogRow, MessageType } from "@/types";

interface UseMessageLogOptions {
  messageType?: MessageType;
  patientId?: string;
}

interface UseMessageLogState {
  error: string | null;
  isLoading: boolean;
  messages: MessageLogRow[];
}

const SELECT_FIELDS =
  "id, clinic_id, patient_id, treatment_plan_id, appointment_id, message_type, channel, status, sent_at, delivered_at, error_message, message_content, external_message_id, created_at";

export function useMessageLog({ patientId, messageType }: UseMessageLogOptions = {}) {
  const { clinicId } = useAuth();
  const [state, setState] = useState<UseMessageLogState>({
    error: null,
    isLoading: true,
    messages: [],
  });

  const loadMessages = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, messages: [] });
      return;
    }

    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, messages: [] });
      return;
    }

    let query = supabase
      .from("message_log")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);
    if (messageType) query = query.eq("message_type", messageType);

    const { data, error } = await query;

    if (error) {
      setState({ error: error.message, isLoading: false, messages: [] });
      return;
    }

    setState({
      error: null,
      isLoading: false,
      messages: (data ?? []) as MessageLogRow[],
    });
  }, [clinicId, patientId, messageType]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive)
          setState({ error: supabaseConfigMessage, isLoading: false, messages: [] });
        return;
      }

      if (!clinicId) {
        if (isActive)
          setState({ error: "No clinic context", isLoading: false, messages: [] });
        return;
      }

      let query = supabase
        .from("message_log")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (patientId) query = query.eq("patient_id", patientId);
      if (messageType) query = query.eq("message_type", messageType);

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, messages: [] });
        return;
      }

      setState({
        error: null,
        isLoading: false,
        messages: (data ?? []) as MessageLogRow[],
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, patientId, messageType]);

  return {
    ...state,
    refreshMessages: loadMessages,
  };
}
