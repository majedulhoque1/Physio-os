import { useNavigate } from "react-router-dom";
import { Building2, Users, CreditCard, DollarSign } from "lucide-react";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import { usePlatformStats, useTenantList } from "@/hooks/useSuperAdmin";

const STATUS_COLORS: Record<string, string> = {
  active: "#4ADE80",
  trialing: "#FEF08A",
  past_due: "#FF79C6",
  cancelled: "#e5e7eb",
  incomplete: "#FF79C6",
};

function SubscriptionStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 font-bold text-xs">—</span>;
  return (
    <span
      className="nb-badge"
      style={{ background: STATUS_COLORS[status] ?? "#FF79C6" }}
    >
      {status}
    </span>
  );
}

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
        <h1 className="nb-heading text-4xl text-black">Platform Overview</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Cross-tenant metrics for Physio OS
        </p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse"
              style={{ border: "3px solid #000", borderRadius: "2px", background: "#e5e7eb" }}
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SAStatCard icon={Building2} label="Total Clinics" value={stats.total_clinics} />
          <SAStatCard icon={Users} label="Total Users" value={stats.total_users} />
          <SAStatCard icon={CreditCard} label="Active Subs" value={stats.active_subscriptions} />
          <SAStatCard icon={DollarSign} label="MRR" value={formatMrr(stats.mrr_cents)} />
        </div>
      ) : null}

      {/* Recent Tenants */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="nb-heading text-xl text-black">Recent Clinics</h2>
          <button
            onClick={() => navigate("/super-admin/tenants")}
            className="nb-btn bg-white text-black px-3 py-1.5 text-sm"
          >
            View all
          </button>
        </div>

        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tenantsLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-bold text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-bold text-gray-500">
                    No clinics yet
                  </td>
                </tr>
              ) : (
                recentTenants.map((t) => (
                  <tr
                    key={t.clinic_id}
                    onClick={() => navigate(`/super-admin/tenants/${t.clinic_id}`)}
                    className="cursor-pointer"
                  >
                    <td>
                      <p className="font-bold text-black">{t.clinic_name}</p>
                      <p className="text-xs text-gray-500">{t.slug}</p>
                    </td>
                    <td className="font-medium text-gray-700">{t.owner_email ?? "—"}</td>
                    <td>
                      <span className="nb-badge bg-white">{t.plan_key ?? "none"}</span>
                    </td>
                    <td>
                      <SubscriptionStatusBadge status={t.subscription_status} />
                    </td>
                    <td className="text-gray-600 text-xs font-medium">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
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
