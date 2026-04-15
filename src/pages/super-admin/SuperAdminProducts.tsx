import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase as supabaseClient } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export default function SuperAdminProducts() {
  const { products, refetch } = useProducts({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(product_key: string, status: "active" | "disabled") {
    setBusy(true);
    const next = status === "active" ? "disabled" : "active";
    const { error: err } = await supabase.from("products").update({ status: next }).eq("product_key", product_key);
    setBusy(false);
    if (err) setError(err.message);
    else refetch();
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="nb-heading text-2xl">Products</h1>
      {error && <div className="nb-alert-error">{error}</div>}
      <table className="w-full text-sm">
        <thead><tr><th className="p-2 text-left">Key</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Local</th><th className="p-2 text-left">Status</th><th className="p-2"></th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.product_key} className="border-t">
              <td className="p-2 font-mono">{p.product_key}</td>
              <td className="p-2">{p.display_name}</td>
              <td className="p-2">{p.is_local ? "yes" : "no"}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2">
                <button className="nb-btn-sm" disabled={busy}
                  onClick={() => toggle(p.product_key, p.status)}>
                  {p.status === "active" ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">
        Add new products by inserting into the <code>products</code> table. Remote products need{" "}
        <code>supabase_url</code>, <code>bridge_secret_name</code>, and the secret env var set on this project.
      </p>
    </div>
  );
}
