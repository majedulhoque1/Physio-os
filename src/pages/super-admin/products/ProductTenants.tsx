import { useParams, Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useRemoteProductTenants } from "@/hooks/useProductTenants";

export default function ProductTenants() {
  const { productKey } = useParams<{ productKey: string }>();
  const { products, isLoading: productsLoading } = useProducts({ onlyActive: true });
  const product = products.find((p) => p.product_key === productKey);

  const { tenants, isLoading, error, refetch } = useRemoteProductTenants(productKey ?? "");

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="nb-heading text-2xl">{product.display_name}</h1>
        <button onClick={refetch} className="nb-btn">Refresh</button>
      </div>
      {isLoading && <p>Loading tenants…</p>}
      {error && <div className="nb-alert-error">{error}</div>}
      {!isLoading && !error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">External ID</th>
              <th className="p-2">Users</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={String(t.org_id)} className="border-t">
                <td className="p-2 font-mono text-xs">{String(t.org_id)}</td>
                <td className="p-2">{String(t.user_count ?? 0)}</td>
                <td className="p-2">
                  <Link
                    to={`/super-admin/products/${productKey}/tenants/${encodeURIComponent(String(t.org_id))}`}
                    className="underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
