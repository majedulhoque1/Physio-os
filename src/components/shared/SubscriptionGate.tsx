import { useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestUpgrade } from "@/hooks/useSubscription";

export function SubscriptionGate() {
  const { isAccessLocked, isSuperAdmin, role, clinicId, upgradeRequested } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  if (!isAccessLocked || isSuperAdmin || role === "clinic_admin") return null;

  async function handleUpgrade() {
    if (!clinicId || requesting) return;
    setRequesting(true);
    await requestUpgrade(clinicId);
    setRequesting(false);
    setRequested(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subscription-gate-title">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Lock className="h-7 w-7 text-red-500" />
          </div>
        </div>
        <h2 id="subscription-gate-title" className="text-lg font-bold text-gray-900">Access Paused</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your free trial has ended. Request an upgrade to continue using Physio OS.
        </p>
        <div className="mt-6 space-y-2">
          {upgradeRequested || requested ? (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
              Upgrade request sent — we'll be in touch shortly.
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={requesting}
              className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              {requesting ? "Sending request..." : "Request Upgrade"}
            </button>
          )}
          <p className="text-xs text-gray-400">
            Contact support if you have questions.
          </p>
        </div>
      </div>
    </div>
  );
}
