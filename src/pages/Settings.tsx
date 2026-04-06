import { Bell, Building2, Key, LogOut, Save, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useClinicSettings } from "@/hooks/useClinicSettings";
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
  const { settings: clinicSettings, updateSettings, isLoading: settingsLoading } = useClinicSettings();

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
      .select("id, clinic_id, user_id, role, status, invited_by, created_at, updated_at, profile:user_profiles!clinic_memberships_user_id_fkey(full_name, phone)")
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("create_staff_member", {
      p_email: staffEmail.trim(),
      p_password: staffPassword,
      p_full_name: staffName.trim(),
      p_role: staffRole,
      p_phone: staffPhone.trim() || null,
      p_specialization: staffRole === "therapist" ? staffSpecialization.trim() || null : null,
    });
    setIsAddingStaff(false);

    if (error) {
      toast({ title: "Failed to add staff", description: error.message, variant: "error" });
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

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingProfile}
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

          {settingsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : clinicSettings ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message Toggles
                </p>
                {([
                  { key: "auto_thank_you_enabled" as const, label: "Thank-you after payment" },
                  { key: "auto_reminder_enabled" as const, label: "Session reminder (day before)" },
                  { key: "auto_missed_alert_enabled" as const, label: "Missed session alert" },
                  { key: "auto_followup_enabled" as const, label: "Post-treatment follow-up" },
                ]).map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await updateSettings({ [key]: !clinicSettings[key] });
                        if (result.error) {
                          toast({ title: "Could not update", description: result.error, variant: "error" });
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        clinicSettings[key] ? "bg-primary" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          clinicSettings[key] ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Timing
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Thank-you delay (minutes)
                    <input
                      type="number"
                      min={0}
                      defaultValue={clinicSettings.thank_you_delay_minutes}
                      onBlur={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== clinicSettings.thank_you_delay_minutes) {
                          const result = await updateSettings({ thank_you_delay_minutes: val });
                          if (result.error) toast({ title: "Error", description: result.error, variant: "error" });
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Reminder (hours before)
                    <input
                      type="number"
                      min={1}
                      defaultValue={clinicSettings.reminder_hours_before}
                      onBlur={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== clinicSettings.reminder_hours_before) {
                          const result = await updateSettings({ reminder_hours_before: val });
                          if (result.error) toast({ title: "Error", description: result.error, variant: "error" });
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Follow-up delay (days)
                    <input
                      type="number"
                      min={1}
                      defaultValue={clinicSettings.followup_delay_days}
                      onBlur={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== clinicSettings.followup_delay_days) {
                          const result = await updateSettings({ followup_delay_days: val });
                          if (result.error) toast({ title: "Error", description: result.error, variant: "error" });
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Abandoned threshold (days)
                    <input
                      type="number"
                      min={1}
                      defaultValue={clinicSettings.abandoned_threshold_days}
                      onBlur={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== clinicSettings.abandoned_threshold_days) {
                          const result = await updateSettings({ abandoned_threshold_days: val });
                          if (result.error) toast({ title: "Error", description: result.error, variant: "error" });
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message Templates
                </p>
                <p className="text-xs text-muted-foreground">
                  Placeholders: {"{{patient_name}}, {{therapist_name}}, {{clinic_name}}, {{session_number}}, {{total_sessions}}, {{appointment_date}}, {{appointment_time}}"}
                </p>
                {([
                  { key: "thank_you_template" as const, label: "Thank You" },
                  { key: "reminder_template" as const, label: "Reminder" },
                  { key: "missed_template" as const, label: "Missed Session" },
                  { key: "followup_template" as const, label: "Follow-up" },
                ]).map(({ key, label }) => (
                  <label key={key} className="text-sm font-medium text-foreground">
                    {label}
                    <textarea
                      defaultValue={clinicSettings[key] ?? ""}
                      rows={2}
                      onBlur={async (e) => {
                        const val = e.target.value.trim();
                        if (val !== (clinicSettings[key] ?? "")) {
                          const result = await updateSettings({ [key]: val || null });
                          if (result.error) toast({ title: "Error", description: result.error, variant: "error" });
                          else toast({ title: `${label} template updated`, variant: "success" });
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Automation settings not available yet.
            </p>
          )}
        </section>
      ) : null}

      {/* Team Members */}
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
    </div>
  );
}
