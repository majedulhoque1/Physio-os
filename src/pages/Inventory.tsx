import { useState, useMemo } from "react";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import { MOCK_PRODUCTS } from "./inventory/mockInventory";
import type { Product, ProductCategory } from "./inventory/mockInventory";
import { ProductModal } from "./inventory/ProductModal";
import { StockActionModal } from "./inventory/StockActionModal";
import { PageHeader } from "@/components/shared/PageHeader";

const CATEGORIES: ProductCategory[] = [
  "Equipment",
  "Therapy Devices",
  "Consumables",
  "Exercise Aids",
  "Recovery",
];

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Equipment: "bg-blue-50 text-blue-700",
  "Therapy Devices": "bg-purple-50 text-purple-700",
  Consumables: "bg-orange-50 text-orange-700",
  "Exercise Aids": "bg-green-50 text-green-700",
  Recovery: "bg-pink-50 text-pink-700",
};

function stockStatus(p: Product): { label: string; className: string } {
  if (p.stock === 0)
    return { label: "Out of Stock", className: "bg-red-100 text-red-700" };
  if (p.stock <= p.lowStockThreshold)
    return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", className: "bg-green-100 text-green-700" };
}

export function Inventory() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "All">("All");
  const [editingProduct, setEditingProduct] = useState<Product | null | "new">(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const lowStockItems = products.filter((p) => p.stock <= p.lowStockThreshold);
  const showBanner = !bannerDismissed && lowStockItems.length > 0;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "All" || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  function handleSave(product: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx === -1) return [...prev, product];
      const next = [...prev];
      next[idx] = product;
      return next;
    });
    setEditingProduct(null);
  }

  function handleDelete(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setEditingProduct(null);
  }

  function handleStockUpdate(id: string, delta: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
      )
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Inventory"
        description="Manage physiotherapy products and stock levels."
        actions={
          <button
            onClick={() => setEditingProduct("new")}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />

      {/* Low-stock banner */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm text-amber-800">
            <span className="font-medium">Low stock alert: </span>
            {lowStockItems.map((p, i) => (
              <span key={p.id}>
                {p.name}
                {i < lowStockItems.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-400 hover:text-amber-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as ProductCategory | "All")
          }
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-200">
          <button
            onClick={() => setView("grid")}
            className={`rounded-l-lg px-3 py-2 text-sm ${
              view === "grid"
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`rounded-r-lg px-3 py-2 text-sm ${
              view === "table"
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Package className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No products match your filters.</p>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const status = stockStatus(p);
            return (
              <div
                key={p.id}
                className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => setStockProduct(p)}
              >
                {/* Image placeholder */}
                <div
                  className={`flex h-24 items-center justify-center rounded-lg ${CATEGORY_COLORS[p.category]} bg-opacity-30`}
                >
                  <Package className="h-8 w-8 opacity-40" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {p.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{p.sku}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[p.category]}`}
                  >
                    {p.category}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    ৳{p.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Stock: <strong className="text-gray-800">{p.stock}</strong>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProduct(p);
                    }}
                    className="text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Price (BDT)</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = stockStatus(p);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[p.category]}`}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      ৳{p.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {p.stock}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setStockProduct(p)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Stock
                        </button>
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {editingProduct !== null && (
        <ProductModal
          product={editingProduct === "new" ? null : editingProduct}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {stockProduct && (
        <StockActionModal
          product={stockProduct}
          onUpdate={handleStockUpdate}
          onClose={() => setStockProduct(null)}
        />
      )}
    </div>
  );
}
