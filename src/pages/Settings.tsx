import { Building2, LogOut, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useMockClinic } from "@/contexts/MockClinicContext";
import { supabase } from "@/lib/supabase";
import type { ClinicMembershipRow, ClinicStaffRole, StatusTone, UserProfileRow } from "@/types";

function roleTone(role: ClinicStaffRole): StatusTone {
  switch (role) {
    case "clinic_admin":
      return "purple";
    case "therapist":
      return "blue";
    case "receptionist":
      return "indigo";
    default:
      return "gray";
  }
}

function roleLabel(role: ClinicStaffRole) {
  switch (role) {
    case "clinic_admin":
      return "Admin";
    case "therapist":
      return "Therapist";
    case "receptionist":
      return "Receptionist";
  }
}

interface MemberWithProfile extends ClinicMembershipRow {
  profile?: Pick<UserProfileRow, "full_name" | "phone"> | null;
}

export function Settings() {
  const { can, clinic, clinicId, isDemoMode, signOut, user, userProfile } = useAuth();
  const { data: mockData } = useMockClinic();
  const { toast } = useToast();

  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [liveMembers, setLiveMembers] = useState<MemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(!isDemoMode);

  const members = isDemoMode ? mockData.members : liveMembers;

  useEffect(() => {
    if (isDemoMode || !supabase || !clinicId) {
      return;
    }

    let isActive = true;

    supabase
      .from("clinic_memberships")
      .select("id, clinic_id, user_id, role, status, invited_by, created_at, updated_at, profile:user_profiles!clinic_memberships_user_id_fkey(full_name, phone)")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .then(({ data }) => {
        if (!isActive) return;
        setLiveMembers((data ?? []) as MemberWithProfile[]);
        setMembersLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [clinicId, isDemoMode]);

  async function handleSaveClinic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isDemoMode) {
      toast({
        title: "Demo clinic settings are read-only",
        description: "Use the seeded roles to validate access and workflow behavior.",
        variant: "success",
      });
      return;
    }

    if (!supabase || !clinicId) return;

    const formData = new FormData(e.currentTarget);
    const nextClinicName = formData.get("clinicName")?.toString().trim();
    if (!nextClinicName) return;

    setIsSavingClinic(true);
    const { error } = await supabase
      .from("clinics")
      .update({ name: nextClinicName } as never)
      .eq("id", clinicId);
    setIsSavingClinic(false);

    if (error) {
      toast({
        title: "Could not save clinic name",
        description: error.message,
        variant: "error",
      });
      return;
    }

    toast({ title: "Clinic name updated", variant: "success" });
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isDemoMode) {
      toast({
        title: "Demo profiles are fixed",
        description: "These seeded accounts stay stable so role testing remains consistent.",
        variant: "success",
      });
      return;
    }

    if (!supabase || !user?.id) return;

    const formData = new FormData(e.currentTarget);
    const nextFullName = formData.get("fullName")?.toString().trim() ?? "";

    setIsSavingProfile(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({ full_name: nextFullName } as never)
      .eq("id", user.id);
    setIsSavingProfile(false);

    if (error) {
      toast({
        title: "Could not update profile",
        description: error.message,
        variant: "error",
      });
      return;
    }

    toast({ title: "Profile updated", variant: "success" });
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage clinic and account settings." />

      {isDemoMode ? (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground shadow-card">
          Demo mode is active. Clinic and profile details stay fixed so the seeded
          role logins remain stable for testing.
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Clinic</h2>
          </div>

          <form key={clinic?.id ?? "clinic-form"} onSubmit={handleSaveClinic} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Clinic name
              </label>
              <input
                name="clinicName"
                type="text"
                defaultValue={clinic?.name ?? ""}
                required
                disabled={!can("manage_clinic")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {clinic?.slug ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Clinic ID
                </label>
                <p className="rounded-lg border border-border bg-slate-50 px-3 py-2.5 font-mono text-sm text-muted-foreground">
                  {clinic.slug}
                </p>
              </div>
            ) : null}

            {can("manage_clinic") ? (
              <button
                type="submit"
                disabled={isSavingClinic}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSavingClinic ? "Saving..." : "Save clinic"}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Clinic settings are only editable by an admin.
              </p>
            )}
          </form>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
          </div>

          <form
            key={user?.id ?? "profile-form"}
            onSubmit={handleSaveProfile}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                name="fullName"
                type="text"
                defaultValue={userProfile?.full_name ?? ""}
                disabled={isDemoMode}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm text-muted-foreground">
                {user?.email ?? "—"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingProfile || isDemoMode}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-slate-50 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Team members</h2>

        {membersLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active members found.</p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.profile?.full_name ?? member.user_id}
                  </p>
                  {member.profile?.phone ? (
                    <p className="text-xs text-muted-foreground">{member.profile.phone}</p>
                  ) : null}
                </div>
                <StatusBadge label={roleLabel(member.role)} tone={roleTone(member.role)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
