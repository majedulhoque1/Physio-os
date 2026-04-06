import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { ClinicSettingsRow, Database } from "@/types";

interface UseClinicSettingsState {
  error: string | null;
  isLoading: boolean;
  settings: ClinicSettingsRow | null;
}

type SettingsUpdate = Database["public"]["Tables"]["clinic_settings"]["Update"];

const SELECT_FIELDS =
  "id, clinic_id, auto_thank_you_enabled, auto_reminder_enabled, auto_missed_alert_enabled, auto_followup_enabled, thank_you_delay_minutes, reminder_hours_before, followup_delay_days, abandoned_threshold_days, thank_you_template, reminder_template, missed_template, followup_template, default_session_duration_mins, currency, timezone, created_at, updated_at";

export function useClinicSettings() {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<UseClinicSettingsState>({
    error: null,
    isLoading: true,
    settings: null,
  });

  const loadSettings = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, settings: null });
      return;
    }

    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, settings: null });
      return;
    }

    const { data, error } = await supabase
      .from("clinic_settings")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (error) {
      setState({ error: error.message, isLoading: false, settings: null });
      return;
    }

    setState({
      error: null,
      isLoading: false,
      settings: (data as unknown as ClinicSettingsRow) ?? null,
    });
  }, [clinicId]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive)
          setState({ error: supabaseConfigMessage, isLoading: false, settings: null });
        return;
      }

      if (!clinicId) {
        if (isActive)
          setState({ error: "No clinic context", isLoading: false, settings: null });
        return;
      }

      const { data, error } = await supabase
        .from("clinic_settings")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, settings: null });
        return;
      }

      setState({
        error: null,
        isLoading: false,
        settings: (data as unknown as ClinicSettingsRow) ?? null,
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId]);

  const updateSettings = useCallback(
    async (updates: SettingsUpdate): Promise<{ error: string | null }> => {
      if (!can("manage_clinic")) {
        return { error: "Only admins can update clinic settings." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const { error } = await supabase
        .from("clinic_settings")
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq("clinic_id", clinicId);

      if (error) return { error: error.message };

      await loadSettings();
      return { error: null };
    },
    [can, clinicId, loadSettings],
  );

  return {
    ...state,
    refreshSettings: loadSettings,
    updateSettings,
  };
}
