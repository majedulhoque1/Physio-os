import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const isLocalhostRuntime =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const ephemeralStorage = {
  getItem: async (_key: string) => null,
  removeItem: async (_key: string) => {},
  setItem: async (_key: string, _value: string) => {},
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: !isLocalhostRuntime,
        storage: isLocalhostRuntime ? ephemeralStorage : undefined,
      },
    })
  : null;

export const supabaseConfigMessage = isSupabaseConfigured
  ? null
  : "Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) to .env.local.";
