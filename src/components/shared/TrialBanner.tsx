import { useEffect, useState } from "react";
import { X, Clock, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestUpgrade } from "@/hooks/useSubscription";

const DISMISSED_KEY = "trial_banner_dismissed";

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

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }
    const t = setTimeout(() => setPhase("plan"), 3000);
    return () => clearTimeout(t);
  }, []);

  if (isSuperAdmin) return null;
  if (role !== "clinic_admin") return null;
  if (subscriptionStatus !== "trialing") return null;
  if (dismissed) return null;

  const daysLeft = getDaysLeft(trialEndsAt);

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleUpgrade() {
    if (!clinicId || requesting) return;
    setRequesting(true);
    await requestUpgrade(clinicId);
    setRequesting(false);
    setRequested(true);
  }

  return (
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
                onClick={handleDismiss}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                View Plans
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
  );
}
