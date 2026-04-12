import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import { usePlatformStats, useTenantList } from "@/hooks/useSuperAdmin";

export function SuperAdminDashboard() {
  const { stats, isLoading: statsLoading } = usePlatformStats();
  const { tenants, isLoading: tenantsLoading } = useTenantList("");
  const navigate = useNavigate();

  const recentTenants = tenants.slice(0, 10);

  function formatMrr(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cross-tenant metrics for Physio OS
        </p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-xl border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SAStatCard
            icon={Building2}
            label="Total Clinics"
            value={stats.total_clinics}
          />
          <SAStatCard
            icon={Users}
            label="Total Users"
            value={stats.total_users}
          />
          <SAStatCard
            icon={CreditCard}
            label="Active Subs"
            value={stats.active_subscriptions}
          />
          <SAStatCard
            icon={DollarSign}
            label="MRR"
            value={formatMrr(stats.mrr_cents)}
          />
        </div>
      ) : null}

      {/* Recent Tenants */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Clinics</h2>
          <button
            onClick={() => navigate("/super-admin/tenants")}
            className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors"
          >
            View all
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {tenantsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No clinics yet
                  </td>
                </tr>
              ) : (
                recentTenants.map((t) => (
                  <tr
                    key={t.clinic_id}
                    onClick={() =>
                      navigate(`/super-admin/tenants/${t.clinic_id}`)
                    }
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.clinic_name}</p>
                      <p className="text-xs text-gray-400">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.owner_email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {t.plan_key ?? "none"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionStatusBadge
                        status={t.subscription_status}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>;

  const colors: Record<string, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    trialing: "border-amber-200 bg-amber-50 text-amber-700",
    past_due: "border-red-200 bg-red-50 text-red-700",
    cancelled: "border-gray-200 bg-gray-100 text-gray-500",
    incomplete: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? colors.incomplete
      }`}
    >
      {status}
    </span>
  );
}
