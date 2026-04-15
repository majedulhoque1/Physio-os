import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useRemoteProductTenants } from "@/hooks/useProductTenants";
import { callProductBridge } from "@/lib/productBridge";

export default function ProductTenants() {
  const { productKey } = useParams<{ productKey: string }>();
  const navigate = useNavigate();
  const { products, isLoading: productsLoading } = useProducts({ onlyActive: true });
  const product = products.find((p) => p.product_key === productKey);

  const { tenants, isLoading, error, refetch } = useRemoteProductTenants(productKey ?? "");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDeleteTenant(orgId: string) {
    if (!confirm("DELETE this tenant? This is irreversible.")) return;
    setDeleting(String(orgId));
    setActionError(null);
    try {
      await callProductBridge(productKey ?? "", "delete_tenant", { org_id: String(orgId) });
      refetch();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  if (productsLoading) return <div className="p-6">Loading product...</div>;
  if (!product) return <div className="p-6">Unknown product: {productKey}</div>;
  if (product.is_local) {
    return (
      <div className="p-6">
        <p className="nb-heading mb-2">{product.display_name}</p>
        <p className="text-sm">Local product — manage from the unified tenant list.</p>
        <Link to="/super-admin/tenants" className="underline">Go to tenants</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b-2 border-black flex items-center justify-between">
        <h1 className="nb-heading text-4xl text-black">{product.display_name.toUpperCase()}</h1>
        <button onClick={refetch} className="nb-btn bg-black text-white font-bold px-4 py-2.5 border-2 border-black">Refresh</button>
      </div>

      {actionError && (
        <div className="px-3.5 py-2.5 text-sm font-bold text-black" style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}>
          {actionError}
        </div>
      )}

      {isLoading && <p className="text-center py-8 font-bold">Loading tenants…</p>}
      {error && (
        <div className="px-3.5 py-2.5 text-sm font-bold text-black" style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}>
          {error}
        </div>
      )}
      {!isLoading && !error && (
        <div className="nb-card">
          <table className="nb-table w-full">
            <thead>
              <tr>
                <th>External ID</th>
                <th>Users</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center font-bold text-gray-500">
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={String(t.org_id)}>
                    <td className="font-bold text-black">
                      <Link
                        to={`/super-admin/products/${productKey}/tenants/${encodeURIComponent(String(t.org_id))}`}
                        className="hover:underline"
                      >
                        {String(t.org_id)}
                      </Link>
                    </td>
                    <td className="font-bold text-black">{String(t.user_count ?? 0)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Link
                          to={`/super-admin/products/${productKey}/tenants/${encodeURIComponent(String(t.org_id))}`}
                          className="nb-btn inline-flex h-8 w-8 items-center justify-center bg-[#FEF08A] text-black"
                          title="View/Edit tenant"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteTenant(String(t.org_id))}
                          disabled={deleting === String(t.org_id)}
                          className="nb-btn inline-flex h-8 w-8 items-center justify-center bg-[#FF79C6] text-black"
                          title="Delete tenant"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
