import { usePlatformStats } from "@/hooks/useSuperAdmin";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import { Users, Building2, TrendingUp, DollarSign, Package } from "lucide-react";

const PRODUCT_ACCENT: Record<string, string> = {
  physio_os: "#B4E7FF",
  construction_os: "#FEF08A",
};

export function SuperAdminDashboard() {
  const { stats, isLoading, error } = usePlatformStats();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="nb-heading text-4xl text-black">Dashboard</h1>
          <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
            System overview and key metrics
          </p>
        </div>
        <div
          className="px-4 py-3 text-sm font-bold text-black"
          style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    );
  }

  const mrrDisplay = (stats.mrr_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="nb-heading text-4xl text-black">Dashboard</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          System overview and key metrics
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SAStatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={mrrDisplay}
          accentColor="#FF79C6"
        />
        <SAStatCard
          icon={TrendingUp}
          label="Active Subscriptions"
          value={stats.active_subscriptions}
          accentColor="#B4E7FF"
        />
        <SAStatCard
          icon={Building2}
          label="Total Tenants"
          value={stats.total_tenants}
          accentColor="#4ADE80"
        />
        <SAStatCard
          icon={Users}
          label="Total Users"
          value={stats.total_users}
          accentColor="#FEF08A"
        />
      </div>

      {/* Per-product breakdown */}
      {stats.by_product && stats.by_product.length > 0 && (
        <section>
          <h2 className="nb-heading text-xl text-black mb-4">Products</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.by_product.map((item) => (
              <div key={item.product_key} className="nb-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="nb-heading text-lg text-black capitalize">
                      {item.product_key.replace(/_/g, " ")}
                    </p>
                    <p
                      className="mt-1 font-mono text-xs font-bold"
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #000",
                        borderRadius: "2px",
                        padding: "1px 6px",
                        display: "inline-block",
                      }}
                    >
                      {item.product_key}
                    </p>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center"
                    style={{
                      background: PRODUCT_ACCENT[item.product_key] ?? "#e5e7eb",
                      border: "2px solid #000",
                      borderRadius: "2px",
                    }}
                  >
                    <Package className="h-5 w-5 text-black" />
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <p className="nb-heading text-4xl text-black">{item.tenants}</p>
                  <p className="mb-1 text-sm font-bold text-gray-600 uppercase tracking-wide">tenants</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
