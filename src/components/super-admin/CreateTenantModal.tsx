import { useState } from "react";
import { X, Eye, EyeOff, Copy, Check } from "lucide-react";
import { createTenant } from "@/hooks/useSuperAdmin";

interface CreateTenantModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTenantModal({ onClose, onCreated }: CreateTenantModalProps) {
  const [clinicName, setClinicName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [planKey, setPlanKey] = useState("starter");
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tempPassword.length < 8) { setError("Temp password must be at least 8 characters."); return; }
    setIsSubmitting(true);
    const result = await createTenant({
      clinic_name: clinicName.trim(),
      owner_email: ownerEmail.trim(),
      plan_key: planKey,
      trial_end: null,
      temp_password: tempPassword,
    });
    setIsSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setSuccess({ email: ownerEmail.trim(), password: tempPassword });
  }

  function handleCopy() {
    if (!success) return;
    navigator.clipboard.writeText(`Email: ${success.email}\nPassword: ${success.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleClose() {
    if (success) onCreated();
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="nb-modal w-full max-w-md">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "3px solid #000" }}
        >
          <h2 className="nb-heading text-2xl text-black">
            {success ? "Tenant Created" : "Create Tenant"}
          </h2>
          <button
            onClick={handleClose}
            className="nb-btn bg-white p-1 text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 p-6">
            <p className="text-sm font-bold text-gray-700">
              Share these credentials with the clinic owner. They won't be shown again.
            </p>
            <div
              className="p-4 space-y-2 text-sm"
              style={{ border: "2px solid #000", background: "#FEF08A", borderRadius: "2px" }}
            >
              <div>
                <span className="font-bold text-black uppercase text-xs tracking-wide">Email: </span>
                <span className="font-mono font-bold text-black">{success.email}</span>
              </div>
              <div>
                <span className="font-bold text-black uppercase text-xs tracking-wide">Password: </span>
                <span className="font-mono font-bold text-black">{success.password}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="nb-btn flex-1 inline-flex items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm text-black"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy credentials"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="nb-btn flex-1 bg-[#4ADE80] px-4 py-2.5 text-sm text-black"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Clinic Name
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. PhysioFirst Dhaka"
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Owner Email
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                placeholder="owner@clinic.com"
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Temp Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="nb-input w-full px-3.5 py-2.5 pr-10 text-sm text-black placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-black hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Used only if the owner account is newly created. Share with the clinic owner to log in.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Plan
              </label>
              <select
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value)}
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black"
              >
                <option value="starter">Basic</option>
              </select>
            </div>

            {error && (
              <p
                className="px-3.5 py-2.5 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="nb-btn flex-1 bg-white px-4 py-2.5 text-sm text-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="nb-btn flex-1 bg-black px-4 py-2.5 text-sm text-white"
              >
                {isSubmitting ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
