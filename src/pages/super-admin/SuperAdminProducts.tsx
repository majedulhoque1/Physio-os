import { useState } from "react";
import { Building2, HardHat, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { supabase as supabaseClient } from "@/lib/supabase";
import type { LucideIcon } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

const iconMap: Record<string, LucideIcon> = {
  building: Building2,
  hardhat: HardHat,
  package: Package,
};

export default function SuperAdminProducts() {
  const { products, refetch } = useProducts({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(product_key: string, status: "active" | "disabled") {
    setError(null);
    setBusy(true);
    const next = status === "active" ? "disabled" : "active";
    const { error: err } = await supabase
      .from("products")
      .update({ status: next })
      .eq("product_key", product_key);
    setBusy(false);
    if (err) setError(err.message);
    else refetch();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="nb-heading text-4xl text-black">Products</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Registered products on the platform
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-sm font-bold text-black"
          style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((p) => {
          const Icon = iconMap[p.icon_key ?? ""] ?? Package;
          const isActive = p.status === "active";
          return (
            <div key={p.product_key} className="nb-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                    style={{
                      background: isActive ? "#4ADE80" : "#e5e7eb",
                      border: "2px solid #000",
                      borderRadius: "2px",
                    }}
                  >
                    <Icon className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="nb-heading text-lg text-black">{p.display_name}</p>
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
                      {p.product_key}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className="nb-badge"
                    style={{ background: isActive ? "#4ADE80" : "#e5e7eb" }}
                  >
                    {p.status}
                  </span>
                  <span
                    className="nb-badge"
                    style={{ background: p.is_local ? "#FEF08A" : "#B4E7FF" }}
                  >
                    {p.is_local ? "local" : "remote"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="nb-btn px-4 py-2 text-sm"
                  style={{ background: isActive ? "#fff" : "#4ADE80" }}
                  disabled={busy}
                  onClick={() => toggle(p.product_key, p.status)}
                >
                  {isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        Add new products by inserting into the{" "}
        <code className="font-mono normal-case">products</code> table. Remote products
        need <code className="font-mono normal-case">supabase_url</code>,{" "}
        <code className="font-mono normal-case">bridge_secret_name</code>, and the
        secret env var set on this project.
      </p>
    </div>
  );
}
