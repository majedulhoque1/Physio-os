import { useEffect, useState } from "react";
import { X, Clock, Zap, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestUpgrade } from "@/hooks/useSubscription";

function getDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function TrialBanner() {
  const { role, clinicId, subscriptionStatus, trialEndsAt, upgradeRequested, isSuperAdmin } = useAuth();
  const [phase, setPhase] = useState<"countdown" | "plan">("countdown");
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("plan"), 3000);
    return () => clearTimeout(t);
  }, []);

  if (isSuperAdmin) return null;
  if (role !== "clinic_admin") return null;
  if (subscriptionStatus !== "trialing") return null;
  if (dismissed) return null;

  const daysLeft = getDaysLeft(trialEndsAt);

  function handleDismiss() {
    setDismissed(true);
  }

  async function handleUpgrade() {
    if (!clinicId || requesting) return;
    setRequesting(true);
    await requestUpgrade(clinicId);
    setRequesting(false);
    setRequested(true);
  }

  const planFeatures = [
    "Session reminder automation",
    "Missed session follow-up",
    "Unlimited patients & therapists",
    "Role-based access (admin, therapist, receptionist)",
    "Treatment plan templates",
    "Invoice history & billing dashboard",
    "Priority email support",
  ];

  return (
    <>
    {showModal && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setShowModal(false)}
      >
        <div
          className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowModal(false)}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Basic Plan</h2>
                <p className="text-sm text-amber-600 font-medium">৳5,000 / month</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Everything you need to run your physiotherapy clinic, with automation built in.
            </p>
            <ul className="mb-5 space-y-2">
              {planFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
              <p className="text-xs text-amber-800">
                {daysLeft === 0
                  ? "Your trial has expired. Request an upgrade to keep access."
                  : `${daysLeft} trial day${daysLeft !== 1 ? "s" : ""} remaining.`}
              </p>
            </div>
            {upgradeRequested || requested ? (
              <div className="w-full rounded-lg bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-600">
                Upgrade request sent to super admin
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={requesting}
                className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
              >
                {requesting ? "Requesting..." : "Request Upgrade"}
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative rounded-xl border border-gray-200 bg-white shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {phase === "countdown" ? (
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Free Trial Active</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {daysLeft === 0
                    ? "Trial expires today"
                    : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-amber-400 transition-all"
                style={{ width: `${Math.min(100, (daysLeft / 7) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Basic Plan</p>
                <p className="text-xs text-amber-600 font-medium">৳5,000 / month</p>
              </div>
            </div>
            <ul className="mb-4 space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Session reminder automation
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Missed session follow-up
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Unlimited patients &amp; therapists
              </li>
            </ul>
            <p className="mb-3 text-xs text-amber-600 font-medium">
              {daysLeft === 0 ? "Trial expired" : `${daysLeft} trial day${daysLeft !== 1 ? "s" : ""} left`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                View Details
              </button>
              {upgradeRequested || requested ? (
                <span className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-500">
                  Requested
                </span>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={requesting}
                  className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                >
                  {requesting ? "..." : "Upgrade"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
