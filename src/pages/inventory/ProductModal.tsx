import { useState } from "react";
import { X } from "lucide-react";
import type { Product, ProductCategory } from "./mockInventory";

const CATEGORIES: ProductCategory[] = [
  "Equipment",
  "Therapy Devices",
  "Consumables",
  "Exercise Aids",
  "Recovery",
];

interface Props {
  product: Product | null; // null = add mode
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function newBlank(): Omit<Product, "id"> {
  return {
    name: "",
    sku: "",
    category: "Equipment",
    price: 0,
    stock: 0,
    lowStockThreshold: 3,
    description: "",
  };
}

export function ProductModal({ product, onSave, onDelete, onClose }: Props) {
  const isEdit = product !== null;
  const [form, setForm] = useState<Omit<Product, "id">>(
    isEdit ? { ...product } : newBlank()
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof Omit<Product, "id">>(key: K, value: Omit<Product, "id">[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.sku.trim()) return;
    onSave({
      id: isEdit ? product.id : `p${Date.now()}`,
      ...form,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Product Name *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. TENS Unit"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. TENS-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.category}
                onChange={(e) => set("category", e.target.value as ProductCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Price (BDT)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Stock Qty</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.stock}
                onChange={(e) => set("stock", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Low Stock Alert</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.lowStockThreshold}
                onChange={(e) => set("lowStockThreshold", Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-4">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Delete this product?</span>
                <button
                  onClick={() => onDelete(product.id)}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete Product
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.sku.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {isEdit ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
