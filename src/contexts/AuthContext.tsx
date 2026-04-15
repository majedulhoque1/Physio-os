import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppPermission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import type {
  ClinicMembershipRow,
  ClinicRow,
  ClinicStaffRole,
  ClinicSubscriptionExtRow,
  SubscriptionStatus,
  UserProfileRow,
} from "@/types";

export interface SignUpParams {
  clinicName: string;
  email: string;
  fullName: string;
  password: string;
}

const SUPER_ADMIN_EMAIL = "majedulhoqueofficial@gmail.com";

interface AuthContextValue {
  can: (permission: AppPermission) => boolean;
  clinic: ClinicRow | null;
  clinicId: string | null;
  displayName: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  linkedTherapistId: string | null;
  membership: ClinicMembershipRow | null;
  role: ClinicStaffRole | null;
  session: Session | null;
  user: User | null;
  userProfile: UserProfileRow | null;
  subscription: ClinicSubscriptionExtRow | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt: string | null;
  isAccessLocked: boolean;
  upgradeRequested: boolean;
  allowedMessageTypes: string[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRow | null>(null);
  const [clinic, setClinic] = useState<ClinicRow | null>(null);
  const [membership, setMembership] = useState<ClinicMembershipRow | null>(null);
  const [linkedTherapistId, setLinkedTherapistId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [subscription, setSubscription] = useState<ClinicSubscriptionExtRow | null>(null);

  function clearAuthState() {
    setSession(null);
    setUser(null);
    setUserProfile(null);
    setClinic(null);
    setMembership(null);
    setLinkedTherapistId(null);
    setSubscription(null);
  }

  async function loadUserData(userId: string, jwtClinicId?: string) {
    if (!supabase) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, full_name, phone, avatar_url, default_clinic_id, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    const resolvedProfile = (profile as UserProfileRow | null) ?? null;
    setUserProfile(resolvedProfile);

    const { data: memberships } = await supabase
      .from("clinic_memberships")
      .select("id, clinic_id, user_id, role, status, invited_by, created_at, updated_at")
      .eq("user_id", userId)
      .eq("status", "active");

    const membershipItems = (memberships ?? []) as ClinicMembershipRow[];
    const preferredMembership =
      membershipItems.find(
        (item) => item.clinic_id === resolvedProfile?.default_clinic_id,
      ) ??
      membershipItems[0] ??
      null;

    setMembership(preferredMembership);

    const resolvedClinicId =
      resolvedProfile?.default_clinic_id ??
      preferredMembership?.clinic_id ??
      jwtClinicId ??
      null;

    if (resolvedClinicId) {
      const { data: clinicData } = await supabase
        .from("clinics")
        .select("id, name, slug, owner_user_id, created_at, updated_at")
        .eq("id", resolvedClinicId)
        .maybeSingle();
      setClinic(clinicData ?? null);

      const { data: therapistData } = await supabase
        .from("therapists")
        .select("id")
        .eq("clinic_id", resolvedClinicId)
        .eq("user_id", userId)
        .maybeSingle();

      setLinkedTherapistId((therapistData as { id: string } | null)?.id ?? null);

      // Load subscription state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: subData } = await (supabase as any).rpc("get_my_subscription");
      setSubscription((subData as ClinicSubscriptionExtRow | null) ?? null);
    } else {
      setClinic(null);
      setLinkedTherapistId(null);
      setSubscription(null);
    }

  }

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id, session.user.app_metadata?.clinic_id as string | undefined).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadUserData(session.user.id, session.user.app_metadata?.clinic_id as string | undefined).finally(() => setIsLoading(false));
        return;
      }

      setUserProfile(null);
      setClinic(null);
      setMembership(null);
      setLinkedTherapistId(null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    clearAuthState();
  }

  async function signUp({ email, password, fullName, clinicName }: SignUpParams) {
    if (!supabase) return { error: "Supabase not configured" };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Signup failed — no user returned" };

    // Email confirmation required — session not issued yet
    if (!data.session) {
      return { error: null, needsEmailConfirmation: true };
    }

    // Use SECURITY DEFINER RPC so clinic + membership creation bypasses RLS
    // (the JWT has no clinic_id claim yet at first signup)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (supabase as any).rpc(
      "provision_clinic_for_current_user",
      { p_clinic_name: clinicName.trim() },
    );

    if (rpcErr) return { error: rpcErr.message };

    // Update display name if profile wasn't auto-created by trigger with the right name
    await supabase
      .from("user_profiles")
      .update({ full_name: fullName.trim() } as never)
      .eq("id", data.user.id);

    return { error: null };
  }

  const role = membership?.role ?? null;
  const displayName = userProfile?.full_name ?? user?.email ?? "User";
  const isAuthenticated = Boolean(user);
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const subscriptionStatus = subscription?.status ?? null;
  const trialEndsAt = subscription?.trial_ends_at ?? null;
  const isAccessLocked = subscription?.is_locked ?? false;
  const upgradeRequested = subscription?.upgrade_requested_at != null;
  const allowedMessageTypes = subscription?.allowed_message_types ?? [];

  return (
    <AuthContext.Provider
      value={{
        can: (permission) => hasPermission(role, permission),
        clinic,
        clinicId: clinic?.id ?? null,
        displayName,
        isAuthenticated,
        isLoading,
        isSuperAdmin,
        linkedTherapistId,
        membership,
        role,
        session,
        user,
        userProfile,
        subscription,
        subscriptionStatus,
        trialEndsAt,
        isAccessLocked,
        upgradeRequested,
        allowedMessageTypes,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
