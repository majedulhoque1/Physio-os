import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type {
  AdviceCategory,
  BanglaAdviceInsert,
  BanglaAdviceRow,
  BanglaAdviceUpdate,
} from "@/types";

const SELECT_FIELDS =
  "id, clinic_id, category, text_bn, text_en, is_active, sort_order, created_at";

interface State {
  error: string | null;
  isLoading: boolean;
  advice: BanglaAdviceRow[];
}

export function useBanglaAdvice() {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<State>({ error: null, isLoading: true, advice: [] });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, advice: [] });
      return;
    }
    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, advice: [] });
      return;
    }
    const { data, error } = await supabase
      .from("bangla_advice_library")
      .select(SELECT_FIELDS)
      .or(`clinic_id.is.null,clinic_id.eq.${clinicId}`)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      setState({ error: error.message, isLoading: false, advice: [] });
      return;
    }
    setState({ error: null, isLoading: false, advice: (data ?? []) as BanglaAdviceRow[] });
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const byCategory = state.advice.reduce<Record<AdviceCategory, BanglaAdviceRow[]>>(
    (acc, row) => {
      const cat = row.category as AdviceCategory;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(row);
      return acc;
    },
    {} as Record<AdviceCategory, BanglaAdviceRow[]>,
  );

  const create = useCallback(
    async (input: Omit<BanglaAdviceInsert, "clinic_id">) => {
      if (!can("manage_prescription_library")) return { error: "No permission", id: null };
      if (!supabase || !clinicId) return { error: "No clinic context", id: null };
      const payload: BanglaAdviceInsert = { ...input, clinic_id: clinicId };
      const { data, error } = await supabase
        .from("bangla_advice_library")
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
    async (id: string, patch: BanglaAdviceUpdate) => {
      if (!can("manage_prescription_library")) return { error: "No permission" };
      if (!supabase || !clinicId) return { error: "No clinic context" };
      const { error } = await supabase
        .from("bangla_advice_library")
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

  return { ...state, byCategory, create, update, deactivate, refresh: load };
}
