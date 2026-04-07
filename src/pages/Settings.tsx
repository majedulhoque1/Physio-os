import { Bell, Building2, Key, LogOut, Save, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";

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
  const { can, clinic, clinicId, signOut, user, userProfile } = useAuth();
  if (!user) return null;
  const { toast } = useToast();

  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [liveMembers, setLiveMembers] = useState<MemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Add staff state
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<"therapist" | "receptionist">("therapist");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffSpecialization, setStaffSpecialization] = useState("");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);

  async function loadMembers() {
    if (!supabase || !clinicId) return;
    const { data } = await supabase
      .from("clinic_memberships")
      .select("id, clinic_id, user_id, role, status, invited_by, created_at, updated_at, profile:user_profiles!clinic_memberships_user_id_profile_fkey(full_name, phone)")
      .eq("clinic_id", clinicId)
      .eq("status", "active");
    setLiveMembers((data ?? []) as MemberWithProfile[]);
    setMembersLoading(false);
  }

  useEffect(() => {
    if (!supabase || !clinicId) {
      setMembersLoading(false);
      return;
    }

    let isActive = true;
    loadMembers().then(() => {
      if (!isActive) setMembersLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [clinicId]);

  async function handleSaveClinic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

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

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) return;

    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "error" });
      return;
    }

    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      toast({ title: "Could not change password", description: error.message, variant: "error" });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated successfully", variant: "success" });
  }

  async function handleAddStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) return;

    if (staffPassword.length < 8) {
      toast({ title: "Staff password must be at least 8 characters", variant: "error" });
      return;
    }

    setIsAddingStaff(true);
    try {
      const { data: { session: currentSession } } = await supabase!.auth.getSession();
      if (!currentSession?.access_token) {
        setIsAddingStaff(false);
        toast({ title: "Failed to add staff", description: "Session expired — please log in again", variant: "error" });
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-member`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: staffEmail.trim(),
            password: staffPassword,
            full_name: staffName.trim(),
            role: staffRole,
            phone: staffPhone.trim() || null,
            specialization: staffRole === "therapist" ? staffSpecialization.trim() || null : null,
          }),
        },
      );

      const result = await res.json();
      setIsAddingStaff(false);

      if (!res.ok || !result?.success) {
        toast({ title: "Failed to add staff", description: result?.error || "Unknown error", variant: "error" });
        return;
      }
    } catch (err: unknown) {
      setIsAddingStaff(false);
      toast({ title: "Failed to add staff", description: err instanceof Error ? err.message : "Unknown error", variant: "error" });
      return;
    }

    toast({ title: `${staffName.trim()} added as ${staffRole}`, variant: "success" });
    setStaffEmail("");
    setStaffPassword("");
    setStaffName("");
    setStaffPhone("");
    setStaffSpecialization("");
    setStaffRole("therapist");
    setShowAddStaff(false);
    await loadMembers();
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage clinic and account settings." />

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

            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
      </div>

      {/* Change Password */}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Re-enter new password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Key className="h-4 w-4" />
            {isChangingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>

      {/* Automation Settings */}
      {can("manage_clinic") ? (
        <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Automation</h2>
          </div>

          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Coming soon</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Automated WhatsApp reminders, thank-you messages, missed session alerts, and follow-ups — all configurable per clinic.
            </p>
          </div>
        </section>
      ) : null}

      {/* Team Members — admin-only section comes before sign-out */}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Team members</h2>
          {can("manage_clinic") && (
            <button
              type="button"
              onClick={() => setShowAddStaff(!showAddStaff)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add staff
            </button>
          )}
        </div>

        {showAddStaff && can("manage_clinic") && (
          <form onSubmit={handleAddStaff} className="mb-6 rounded-lg border border-border bg-background p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Add new staff member</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  required
                  placeholder="Dr. Tania Sultana"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  required
                  placeholder="staff@clinic.com"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Temp password * (min 8 chars)</label>
                <input
                  type="text"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Temp1234"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as "therapist" | "receptionist")}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="therapist">Therapist</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                <input
                  type="tel"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              {staffRole === "therapist" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Specialization</label>
                  <input
                    type="text"
                    value={staffSpecialization}
                    onChange={(e) => setStaffSpecialization(e.target.value)}
                    placeholder="Orthopedic, Neuro, etc."
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Staff can change their password after first login from Settings.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAddingStaff}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {isAddingStaff ? "Creating..." : "Create staff account"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddStaff(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {membersLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : liveMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active members found.</p>
        ) : (
          <div className="divide-y divide-border">
            {liveMembers.map((member) => (
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
      {/* Sign out */}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Sign out</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You'll be redirected to the login page.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
