import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { ProtocolTemplateInsert, ProtocolTemplateRow, ProtocolTemplateUpdate } from "@/types";

const SELECT_FIELDS =
  "id, clinic_id, name, diagnosis, default_modalities, default_exercises, default_advice_en, default_advice_bn, default_body_parts, is_active, sort_order, created_at, updated_at";

interface State {
  error: string | null;
  isLoading: boolean;
  templates: ProtocolTemplateRow[];
}

export function useProtocolTemplates() {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<State>({ error: null, isLoading: true, templates: [] });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, templates: [] });
      return;
    }
    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, templates: [] });
      return;
    }

    const { data, error } = await supabase
      .from("protocol_templates")
      .select(SELECT_FIELDS)
      .or(`clinic_id.is.null,clinic_id.eq.${clinicId}`)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      setState({ error: error.message, isLoading: false, templates: [] });
      return;
    }
    setState({ error: null, isLoading: false, templates: (data ?? []) as ProtocolTemplateRow[] });
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: Omit<ProtocolTemplateInsert, "clinic_id">) => {
      if (!can("manage_prescription_library")) return { error: "No permission", id: null };
      if (!supabase || !clinicId) return { error: "No clinic context", id: null };

      const payload: ProtocolTemplateInsert = { ...input, clinic_id: clinicId };
      const { data, error } = await supabase
        .from("protocol_templates")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, id: null };
      await load();
      return { error: null, id: (data as any)?.id ?? null };
    },
    [can, clinicId, load],
  );

  const update = useCallback(
    async (id: string, patch: ProtocolTemplateUpdate) => {
      if (!can("manage_prescription_library")) return { error: "No permission" };
      if (!supabase || !clinicId) return { error: "No clinic context" };
      const { error } = await supabase
        .from("protocol_templates")
        .update(patch as never)
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [can, clinicId, load],
  );

  const deactivate = useCallback(
    async (id: string) => update(id, { is_active: false }),
    [update],
  );

  return { ...state, create, update, deactivate, refresh: load };
}
