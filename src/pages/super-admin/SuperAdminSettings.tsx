import { useState } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function SuperAdminSettings() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!supabase || !user?.email) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInErr) {
      setIsLoading(false);
      setError("Current password is incorrect");
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="nb-heading text-4xl text-black">Settings</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Manage your super admin account
        </p>
      </div>

      <div className="max-w-lg">
        <div className="nb-card p-6">
          {/* Section header */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center"
              style={{ background: "#B4E7FF", border: "2px solid #000", borderRadius: "2px" }}
            >
              <KeyRound className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="nb-heading text-lg text-black">Change Password</p>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Update your admin password
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-black uppercase tracking-wide">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="nb-input w-full px-3 py-2.5 text-sm text-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-black uppercase tracking-wide">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="nb-input w-full px-3 py-2.5 text-sm text-black"
              />
              <p className="mt-1 text-xs font-bold text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-black uppercase tracking-wide">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="nb-input w-full px-3 py-2.5 text-sm text-black"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#4ADE80", borderRadius: "2px" }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Password updated successfully
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="nb-btn bg-black px-5 py-2.5 text-sm text-white"
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
