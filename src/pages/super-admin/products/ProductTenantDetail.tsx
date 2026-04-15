import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { callProductBridge } from "@/lib/productBridge";
import { useProducts } from "@/hooks/useProducts";

export default function ProductTenantDetail() {
  const { productKey, externalId } = useParams<{ productKey: string; externalId: string }>();
  const navigate = useNavigate();
  const { products } = useProducts({ onlyActive: true });
  const product = products.find((p) => p.product_key === productKey);

  const [data, setData] = useState<unknown>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productKey || !externalId) return;
    setError(null);
    Promise.all([
      callProductBridge(productKey, "get_tenant_data", { org_id: externalId }),
      callProductBridge<Array<Record<string, unknown>>>(productKey, "list_users", { org_id: externalId }),
    ])
      .then(([d, u]) => {
        setData(d);
        setUsers(Array.isArray(u) ? u : []);
      })
      .catch((e: Error) => setError(e.message));
  }, [productKey, externalId]);

  async function act(action: "suspend_tenant" | "delete_tenant", confirmMsg: string) {
    if (!productKey || !externalId) return;
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      await callProductBridge(productKey, action, { org_id: externalId });
      if (action === "delete_tenant") navigate(`/super-admin/products/${productKey}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function actUser(userId: string, action: "disable_user" | "enable_user") {
    setBusy(true);
    setError(null);
    try {
      await callProductBridge(productKey ?? "", action, { user_id: userId });
      const refreshed = await callProductBridge<Array<Record<string, unknown>>>(
        productKey ?? "",
        "list_users",
        { org_id: externalId }
      );
      setUsers(Array.isArray(refreshed) ? refreshed : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!product) return <div className="p-6">Loading product…</div>;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="pb-6 border-b-2 border-black">
        <button
          onClick={() => navigate(`/super-admin/products/${productKey}`)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-black hover:bg-black hover:text-white px-2 py-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="nb-heading text-4xl text-black">
          {product.display_name.toUpperCase()} – {externalId?.toUpperCase()}
        </h1>
        <div className="mt-3 flex gap-2">
          <button
            className="nb-btn bg-white text-black border-2 border-black font-bold px-4 py-2.5 text-sm"
            disabled={busy}
            onClick={() => act("suspend_tenant", "Suspend this tenant?")}
          >
            {busy ? "..." : "Suspend"}
          </button>
          <button
            className="nb-btn bg-[#FF79C6] text-black border-2 border-[#FF79C6] font-bold px-4 py-2.5 text-sm"
            disabled={busy}
            onClick={() => act("delete_tenant", "DELETE this tenant? Irreversible.")}
          >
            {busy ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3.5 py-2.5 text-sm font-bold text-black" style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}>
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="nb-heading text-lg text-black uppercase tracking-wide">Users</h2>
        <div className="nb-card">
          <table className="nb-table w-full">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center font-bold text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={String(u.id)}>
                    <td className="font-bold text-black">{String(u.email)}</td>
                    <td>
                      <span className="nb-badge bg-gray-100 text-gray-700 text-xs font-bold">{String(u.status)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {u.status === "active" ? (
                        <button
                          className="text-blue-600 font-bold underline text-sm hover:text-blue-800"
                          onClick={() => actUser(String(u.id), "disable_user")}
                          disabled={busy}
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          className="text-blue-600 font-bold underline text-sm hover:text-blue-800"
                          onClick={() => actUser(String(u.id), "enable_user")}
                          disabled={busy}
                        >
                          Enable
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="nb-heading text-lg text-black uppercase tracking-wide">Raw Tenant Data</h2>
        <div className="nb-card p-4">
          <pre className="text-xs font-mono overflow-x-auto text-gray-800" style={{ lineHeight: "1.5" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}
