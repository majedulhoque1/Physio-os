import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="nb-heading text-2xl">
          {product.display_name} — {externalId}
        </h1>
        <div className="flex gap-2">
          <button
            className="nb-btn"
            disabled={busy}
            onClick={() => act("suspend_tenant", "Suspend this tenant?")}
          >
            Suspend
          </button>
          <button
            className="nb-btn bg-red-500"
            disabled={busy}
            onClick={() => act("delete_tenant", "DELETE this tenant? Irreversible.")}
          >
            Delete
          </button>
        </div>
      </div>

      {error && <div className="nb-alert-error">{error}</div>}

      <section>
        <h2 className="nb-heading mb-2">Users</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.id)} className="border-t">
                <td className="p-2">{String(u.email)}</td>
                <td className="p-2">{String(u.status)}</td>
                <td className="p-2">
                  {u.status === "active" ? (
                    <button className="nb-btn-sm" onClick={() => actUser(String(u.id), "disable_user")}>
                      Disable
                    </button>
                  ) : (
                    <button className="nb-btn-sm" onClick={() => actUser(String(u.id), "enable_user")}>
                      Enable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="nb-heading mb-2">Raw tenant data</h2>
        <pre className="text-xs bg-gray-100 p-3 overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
      </section>
    </div>
  );
}
